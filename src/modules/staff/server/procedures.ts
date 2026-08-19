import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt, isNull, max, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { session, user } from "@/db/auth-schema";
import { invites, inviteUses, memberProfiles } from "@/db/schema";
import {
  buildInviteUrl,
  createInviteToken,
  decryptInviteToken,
  encryptInviteToken,
  hashInviteToken,
  inviteExpiresAt,
} from "@/lib/invite-token";
import {
  ALL_CAPABILITIES,
  capabilitiesFromRole,
  editorModulesFromCapabilities,
  parseCapabilities,
  roleFromCapabilities,
} from "@/lib/permissions";
import { uploadImageToStorage } from "@/lib/storage";
import { isSuperAdminEmail } from "@/lib/super-admin";
import { AUDIT_ACTIONS } from "@/modules/audit/actions";
import { diffFields } from "@/modules/audit/diff";
import { writeAuditLog } from "@/modules/audit/server/write-audit-log";
import {
  createStaffUser,
  setStaffPassword,
  StaffUserError,
} from "@/lib/staff-user";
import {
  acceptInviteSchema,
  createInviteSchema,
  createStaffSchema,
  inviteTokenSchema,
  listInviteUsesSchema,
  removeStaffSchema,
  revealInviteSchema,
  revokeInviteSchema,
  setDisabledSchema,
  setStaffPasswordSchema,
  updateStaffSchema,
} from "@/modules/staff/schema";
import type { InviteRecord, InviteUseRecord, StaffRecord } from "@/modules/staff/types";
import {
  baseProcedure,
  createTRPCRouter,
  requireCapability,
} from "@/trpc/init";

const toStaffRecord = (row: {
  id: string;
  name: string;
  email: string;
  capabilities: string[];
  disabled: boolean;
  createdAt: Date;
  role: string | null;
  isMember: boolean | null;
  showOnAbout: boolean | null;
  photoUrl: string | null;
  lastAccessAt?: Date | null;
}): StaffRecord => ({
  id: row.id,
  name: row.name,
  email: row.email,
  capabilities: parseCapabilities(row.capabilities),
  disabled: row.disabled,
  isMember: row.isMember ?? false,
  showOnAbout: row.showOnAbout ?? false,
  isSuperAdmin: isSuperAdminEmail(row.email),
  role: row.role,
  photoUrl: row.photoUrl,
  createdAt: row.createdAt,
  lastAccessAt: row.lastAccessAt ?? null,
});

const countGestores = async (excludeUserId?: string) => {
  const rows = await db
    .select({
      id: user.id,
      capabilities: user.capabilities,
      disabled: user.disabled,
    })
    .from(user);

  return rows.filter((row) => {
    if (excludeUserId && row.id === excludeUserId) {
      return false;
    }

    if (row.disabled) {
      return false;
    }

    return parseCapabilities(row.capabilities).includes("users:manage");
  }).length;
};

const mapStaffError = (error: unknown): never => {
  if (error instanceof StaffUserError) {
    throw new TRPCError({
      code: error.code,
      message: error.message,
    });
  }

  throw error;
};

export const staffRouter = createTRPCRouter({
  list: requireCapability("users:manage").query(async () => {
    const rows = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        capabilities: user.capabilities,
        disabled: user.disabled,
        createdAt: user.createdAt,
        role: memberProfiles.role,
        isMember: memberProfiles.isMember,
        showOnAbout: memberProfiles.showOnAbout,
        photoUrl: memberProfiles.photoUrl,
      })
      .from(user)
      .leftJoin(memberProfiles, eq(memberProfiles.userId, user.id))
      .orderBy(desc(user.createdAt));

    const lastAccessRows = await db
      .select({
        userId: session.userId,
        lastAccessAt: max(session.updatedAt),
      })
      .from(session)
      .groupBy(session.userId);

    const lastAccessByUser = new Map(
      lastAccessRows.map((row) => [row.userId, row.lastAccessAt]),
    );

    return rows.map((row) =>
      toStaffRecord({
        ...row,
        lastAccessAt: lastAccessByUser.get(row.id) ?? null,
      }),
    );
  }),

  create: requireCapability("users:manage")
    .input(createStaffSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const created = await createStaffUser(input);
        await writeAuditLog({
          actor: ctx.session.user,
          action: AUDIT_ACTIONS.STAFF_CREATE,
          entityType: "user",
          entityId: created.id,
          metadata: {
            name: created.name,
            email: created.email,
            capabilities: input.capabilities,
          },
        });
        return toStaffRecord({
          ...created,
          role: null,
          isMember: false,
          showOnAbout: false,
          photoUrl: null,
        });
      } catch (error) {
        mapStaffError(error);
      }
    }),

  update: requireCapability("users:manage")
    .input(updateStaffSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(user)
        .where(eq(user.id, input.id));

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuário não encontrado.",
        });
      }

      const isSuperAdmin = isSuperAdminEmail(existing.email);
      const wasGestor = parseCapabilities(existing.capabilities).includes(
        "users:manage",
      );
      const willBeGestor = input.capabilities.includes("users:manage");

      if (isSuperAdmin && !willBeGestor) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "O papel do super admin não pode ser alterado.",
        });
      }

      if (!isSuperAdmin && wasGestor && !willBeGestor) {
        const remainingGestores = await countGestores(input.id);

        if (remainingGestores === 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "É preciso manter pelo menos um gestor na equipe.",
          });
        }
      }

      const capabilities = isSuperAdmin
        ? [...ALL_CAPABILITIES]
        : input.capabilities;

      const [existingProfile] = await db
        .select()
        .from(memberProfiles)
        .where(eq(memberProfiles.userId, input.id));

      const nextRole = input.role?.trim() || null;
      const nextShowOnAbout = input.isMember ? input.showOnAbout : false;
      const existingCapabilities = parseCapabilities(existing.capabilities);
      const nextModules = editorModulesFromCapabilities(capabilities);
      const previousModules = editorModulesFromCapabilities(existingCapabilities);

      const changes = diffFields(
        {
          name: existing.name,
          accessRole: roleFromCapabilities(existingCapabilities),
          editorModules: previousModules.join(",") || null,
          ministryRole: existingProfile?.role ?? null,
          isMember: existingProfile?.isMember ?? false,
          showOnAbout: existingProfile?.showOnAbout ?? false,
        },
        {
          name: input.name.trim(),
          accessRole: roleFromCapabilities(capabilities),
          editorModules: nextModules.join(",") || null,
          ministryRole: nextRole,
          isMember: input.isMember,
          showOnAbout: nextShowOnAbout,
        },
      );

      const [updated] = await db
        .update(user)
        .set({
          name: input.name.trim(),
          capabilities,
          updatedAt: new Date(),
        })
        .where(eq(user.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuário não encontrado.",
        });
      }

      await db
        .insert(memberProfiles)
        .values({
          userId: input.id,
          role: nextRole,
          isMember: input.isMember,
          showOnAbout: nextShowOnAbout,
        })
        .onConflictDoUpdate({
          target: memberProfiles.userId,
          set: {
            role: nextRole,
            isMember: input.isMember,
            showOnAbout: nextShowOnAbout,
            updatedAt: new Date(),
          },
        });

      const [profile] = await db
        .select()
        .from(memberProfiles)
        .where(eq(memberProfiles.userId, input.id));

      if (changes.length > 0) {
        await writeAuditLog({
          actor: ctx.session.user,
          action: AUDIT_ACTIONS.STAFF_UPDATE,
          entityType: "user",
          entityId: updated.id,
          metadata: {
            name: updated.name,
            changes,
          },
        });
      }

      return toStaffRecord({
        ...updated,
        role: profile?.role ?? null,
        isMember: profile?.isMember ?? false,
        showOnAbout: profile?.showOnAbout ?? false,
        photoUrl: profile?.photoUrl ?? null,
      });
    }),

  setPassword: requireCapability("users:manage")
    .input(setStaffPasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select({ id: user.id, name: user.name, email: user.email })
        .from(user)
        .where(eq(user.id, input.id));

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuário não encontrado.",
        });
      }

      if (isSuperAdminEmail(existing.email)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "A senha do super admin não pode ser redefinida.",
        });
      }

      await setStaffPassword(input.id, input.password, {
        requirePasswordChange: true,
      });

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.STAFF_PASSWORD_RESET,
        entityType: "user",
        entityId: existing.id,
        metadata: { name: existing.name },
      });

      return { success: true };
    }),

  setDisabled: requireCapability("users:manage")
    .input(setDisabledSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.id === ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não pode desativar o próprio acesso.",
        });
      }

      const [existing] = await db
        .select()
        .from(user)
        .where(eq(user.id, input.id));

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuário não encontrado.",
        });
      }

      if (isSuperAdminEmail(existing.email)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "O super admin não pode ser desativado.",
        });
      }

      if (input.disabled) {
        const isGestor = parseCapabilities(existing.capabilities).includes(
          "users:manage",
        );

        if (isGestor && (await countGestores(input.id)) === 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "É preciso manter pelo menos um gestor na equipe.",
          });
        }

        await db.delete(session).where(eq(session.userId, input.id));
        await db
          .update(memberProfiles)
          .set({ showOnAbout: false, updatedAt: new Date() })
          .where(eq(memberProfiles.userId, input.id));
      }

      await db
        .update(user)
        .set({ disabled: input.disabled, updatedAt: new Date() })
        .where(eq(user.id, input.id));

      await writeAuditLog({
        actor: ctx.session.user,
        action: input.disabled
          ? AUDIT_ACTIONS.STAFF_DISABLE
          : AUDIT_ACTIONS.STAFF_ENABLE,
        entityType: "user",
        entityId: existing.id,
        metadata: {
          name: existing.name,
          disabled: input.disabled,
        },
      });

      return { success: true };
    }),

  remove: requireCapability("users:manage")
    .input(removeStaffSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.id === ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não pode excluir o próprio acesso.",
        });
      }

      const [existing] = await db
        .select()
        .from(user)
        .where(eq(user.id, input.id));

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuário não encontrado.",
        });
      }

      if (isSuperAdminEmail(existing.email)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "O super admin não pode ser excluído.",
        });
      }

      const isGestor = parseCapabilities(existing.capabilities).includes(
        "users:manage",
      );

      if (isGestor && (await countGestores(input.id)) === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "É preciso manter pelo menos um gestor na equipe.",
        });
      }

      await db.delete(user).where(eq(user.id, input.id));

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.STAFF_REMOVE,
        entityType: "user",
        entityId: existing.id,
        metadata: { name: existing.name },
      });

      return { success: true };
    }),

  listInvites: requireCapability("users:manage").query(async () => {
    const now = new Date();
    const rows = await db
      .select({
        id: invites.id,
        capabilities: invites.capabilities,
        expiresAt: invites.expiresAt,
        createdAt: invites.createdAt,
        maxUses: invites.maxUses,
        usedCount: invites.usedCount,
      })
      .from(invites)
      .where(
        and(
          isNull(invites.revokedAt),
          or(isNull(invites.expiresAt), gt(invites.expiresAt, now)),
          or(isNull(invites.maxUses), isNull(invites.usedAt)),
        ),
      )
      .orderBy(desc(invites.createdAt));

    return rows.map(
      (row): InviteRecord => ({
        id: row.id,
        capabilities: parseCapabilities(row.capabilities),
        expiresAt: row.expiresAt,
        createdAt: row.createdAt,
        maxUses: row.maxUses,
        usedCount: row.usedCount,
      }),
    );
  }),

  createInvite: requireCapability("users:manage")
    .input(createInviteSchema)
    .mutation(async ({ ctx, input }) => {
      const token = createInviteToken();
      const capabilities = capabilitiesFromRole(
        input.accessRole,
        input.editorModules,
      );
      const [created] = await db
        .insert(invites)
        .values({
          tokenHash: hashInviteToken(token),
          tokenCipher: encryptInviteToken(token),
          capabilities,
          createdById: ctx.session.user.id,
          maxUses: input.reusable ? null : 1,
          usedCount: 0,
          expiresAt: input.reusable ? null : inviteExpiresAt(),
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Não foi possível criar o convite.",
        });
      }

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.STAFF_INVITE_CREATE,
        entityType: "invite",
        entityId: created.id,
        metadata: {
          accessRole: input.accessRole,
          reusable: input.reusable,
        },
      });

      return {
        id: created.id,
        url: buildInviteUrl(token),
        capabilities: parseCapabilities(created.capabilities),
        expiresAt: created.expiresAt,
        createdAt: created.createdAt,
        maxUses: created.maxUses,
        usedCount: created.usedCount,
      };
    }),

  revealInvite: requireCapability("users:manage")
    .input(revealInviteSchema)
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const [invite] = await db
        .select()
        .from(invites)
        .where(eq(invites.id, input.id));

      if (
        !invite ||
        invite.revokedAt ||
        (invite.expiresAt && invite.expiresAt <= now) ||
        (invite.maxUses === 1 && invite.usedAt)
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Convite não encontrado ou já encerrado.",
        });
      }

      if (!invite.tokenCipher) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Este convite não pode ser copiado de novo. Gere outro.",
        });
      }

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.STAFF_INVITE_REVEAL,
        entityType: "invite",
        entityId: invite.id,
        metadata: {
          accessRole: roleFromCapabilities(parseCapabilities(invite.capabilities)),
        },
      });

      return { url: buildInviteUrl(decryptInviteToken(invite.tokenCipher)) };
    }),

  revokeInvite: requireCapability("users:manage")
    .input(revokeInviteSchema)
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(invites)
        .set({ revokedAt: new Date() })
        .where(and(eq(invites.id, input.id), isNull(invites.revokedAt)))
        .returning({ id: invites.id, capabilities: invites.capabilities });

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Convite não encontrado ou já revogado.",
        });
      }

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.STAFF_INVITE_REVOKE,
        entityType: "invite",
        entityId: updated.id,
        metadata: {
          accessRole: roleFromCapabilities(parseCapabilities(updated.capabilities)),
        },
      });

      return { success: true };
    }),

  listUses: requireCapability("users:manage")
    .input(listInviteUsesSchema)
    .query(async ({ input }) => {
      const [invite] = await db
        .select({
          id: invites.id,
          usedCount: invites.usedCount,
        })
        .from(invites)
        .where(eq(invites.id, input.id));

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Convite não encontrado.",
        });
      }

      const rows = await db
        .select({
          id: inviteUses.id,
          name: inviteUses.name,
          email: inviteUses.email,
          createdAt: inviteUses.createdAt,
          userId: inviteUses.userId,
          disabled: user.disabled,
        })
        .from(inviteUses)
        .leftJoin(user, eq(user.id, inviteUses.userId))
        .where(eq(inviteUses.inviteId, input.id))
        .orderBy(desc(inviteUses.createdAt));

      return {
        usedCount: invite.usedCount,
        uses: rows.map(
          (row): InviteUseRecord => ({
            id: row.id,
            name: row.name,
            email: row.email,
            createdAt: row.createdAt,
            userExists: Boolean(row.userId),
            disabled: row.disabled ?? false,
          }),
        ),
      };
    }),

  getInvite: baseProcedure.input(inviteTokenSchema).query(async ({ input }) => {
    const now = new Date();
    const [invite] = await db
      .select({
        expiresAt: invites.expiresAt,
        usedAt: invites.usedAt,
        revokedAt: invites.revokedAt,
        maxUses: invites.maxUses,
      })
      .from(invites)
      .where(eq(invites.tokenHash, hashInviteToken(input.token)));

    if (
      !invite ||
      invite.revokedAt ||
      (invite.expiresAt && invite.expiresAt <= now) ||
      (invite.maxUses === 1 && invite.usedAt)
    ) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Este convite é inválido ou já expirou.",
      });
    }

    return { valid: true as const, expiresAt: invite.expiresAt };
  }),

  acceptInvite: baseProcedure
    .input(acceptInviteSchema)
    .mutation(async ({ input }) => {
      const tokenHash = hashInviteToken(input.token);
      let createdUserId: string | undefined;
      let acceptedInviteId: string | undefined;

      try {
        await db.transaction(async (tx) => {
          const [invite] = await tx
            .select()
            .from(invites)
            .where(eq(invites.tokenHash, tokenHash));

          const now = new Date();

          if (
            !invite ||
            invite.revokedAt ||
            (invite.expiresAt && invite.expiresAt <= now) ||
            (invite.maxUses === 1 && invite.usedAt)
          ) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Este convite é inválido ou já expirou.",
            });
          }

          if (invite.maxUses === 1) {
            const [claimed] = await tx
              .update(invites)
              .set({ usedAt: now, usedCount: sql`${invites.usedCount} + 1` })
              .where(
                and(eq(invites.id, invite.id), isNull(invites.usedAt)),
              )
              .returning();

            if (!claimed) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Este convite é inválido ou já expirou.",
              });
            }
          } else {
            await tx
              .update(invites)
              .set({ usedCount: sql`${invites.usedCount} + 1` })
              .where(
                and(eq(invites.id, invite.id), isNull(invites.revokedAt)),
              );
          }

          const created = await createStaffUser(
            {
              name: input.name,
              email: input.email,
              password: input.password,
              capabilities: parseCapabilities(invite.capabilities),
              mustChangePassword: false,
            },
            tx,
          );
          createdUserId = created.id;
          acceptedInviteId = invite.id;

          await tx.insert(inviteUses).values({
            inviteId: invite.id,
            userId: created.id,
            name: created.name,
            email: created.email,
          });
        });
      } catch (error) {
        mapStaffError(error);
      }

      if (input.photo && createdUserId) {
        try {
          const uploaded = await uploadImageToStorage({
            dataUrl: input.photo,
            folder: `members/${createdUserId}`,
            fileName: `photo-${Date.now()}.jpg`,
          });

          await db
            .update(memberProfiles)
            .set({
              photoUrl: uploaded.imageUrl,
              storagePath: uploaded.storagePath,
              updatedAt: new Date(),
            })
            .where(eq(memberProfiles.userId, createdUserId));
        } catch {
          // A conta já foi criada; a foto pode ser enviada depois no perfil.
        }
      }

      if (createdUserId && acceptedInviteId) {
        await writeAuditLog({
          actor: {
            id: createdUserId,
            name: input.name,
            email: input.email,
          },
          action: AUDIT_ACTIONS.STAFF_INVITE_ACCEPT,
          entityType: "invite",
          entityId: acceptedInviteId,
          metadata: {
            name: input.name,
            hasPhoto: Boolean(input.photo),
          },
        });
      }

      return { success: true };
    }),
});
