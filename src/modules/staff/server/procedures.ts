import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { session, user } from "@/db/auth-schema";
import { invites, memberProfiles } from "@/db/schema";
import {
  buildInviteUrl,
  createInviteToken,
  decryptInviteToken,
  encryptInviteToken,
  hashInviteToken,
  inviteExpiresAt,
} from "@/lib/invite-token";
import {
  capabilitiesFromRole,
  parseCapabilities,
} from "@/lib/permissions";
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
  removeStaffSchema,
  revealInviteSchema,
  revokeInviteSchema,
  setDisabledSchema,
  setStaffPasswordSchema,
  updateStaffSchema,
} from "@/modules/staff/schema";
import type { InviteRecord, StaffRecord } from "@/modules/staff/types";
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
}): StaffRecord => ({
  id: row.id,
  name: row.name,
  email: row.email,
  capabilities: parseCapabilities(row.capabilities),
  disabled: row.disabled,
  isMember: row.isMember ?? false,
  showOnAbout: row.showOnAbout ?? false,
  role: row.role,
  photoUrl: row.photoUrl,
  createdAt: row.createdAt,
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

    return rows.map(toStaffRecord);
  }),

  create: requireCapability("users:manage")
    .input(createStaffSchema)
    .mutation(async ({ input }) => {
      try {
        const created = await createStaffUser(input);
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
    .mutation(async ({ input }) => {
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

      const wasGestor = parseCapabilities(existing.capabilities).includes(
        "users:manage",
      );
      const willBeGestor = input.capabilities.includes("users:manage");

      if (wasGestor && !willBeGestor) {
        const remainingGestores = await countGestores(input.id);

        if (remainingGestores === 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "É preciso manter pelo menos um gestor na equipe.",
          });
        }
      }

      const [updated] = await db
        .update(user)
        .set({
          name: input.name.trim(),
          capabilities: input.capabilities,
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
          role: input.role?.trim() || null,
          isMember: input.isMember,
          showOnAbout: input.isMember ? input.showOnAbout : false,
        })
        .onConflictDoUpdate({
          target: memberProfiles.userId,
          set: {
            role: input.role?.trim() || null,
            isMember: input.isMember,
            showOnAbout: input.isMember ? input.showOnAbout : false,
            updatedAt: new Date(),
          },
        });

      const [profile] = await db
        .select()
        .from(memberProfiles)
        .where(eq(memberProfiles.userId, input.id));

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
    .mutation(async ({ input }) => {
      const [existing] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, input.id));

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuário não encontrado.",
        });
      }

      await setStaffPassword(input.id, input.password);
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
    .mutation(async ({ input }) => {
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

      return { url: buildInviteUrl(decryptInviteToken(invite.tokenCipher)) };
    }),

  revokeInvite: requireCapability("users:manage")
    .input(revokeInviteSchema)
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(invites)
        .set({ revokedAt: new Date() })
        .where(and(eq(invites.id, input.id), isNull(invites.revokedAt)))
        .returning({ id: invites.id });

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Convite não encontrado ou já revogado.",
        });
      }

      return { success: true };
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

          await createStaffUser(
            {
              name: input.name,
              email: input.email,
              password: input.password,
              capabilities: parseCapabilities(invite.capabilities),
            },
            tx,
          );
        });
      } catch (error) {
        mapStaffError(error);
      }

      return { success: true };
    }),
});
