import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/db/auth-schema";
import { memberProfiles } from "@/db/schema";
import { deleteImageFromStorage, uploadImageToStorage } from "@/lib/storage";
import { AUDIT_ACTIONS } from "@/modules/audit/actions";
import { diffFields } from "@/modules/audit/diff";
import { writeAuditLog } from "@/modules/audit/server/write-audit-log";
import {
  updateMemberFlagsSchema,
  updateMyProfileSchema,
} from "@/modules/members/schema";
import {
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
  requireCapability,
} from "@/trpc/init";

export const membersRouter = createTRPCRouter({
  listPublic: baseProcedure.query(async () => {
    const rows = await db
      .select({
        userId: memberProfiles.userId,
        name: user.name,
        role: memberProfiles.role,
        photoUrl: memberProfiles.photoUrl,
        testimony: memberProfiles.testimony,
      })
      .from(memberProfiles)
      .innerJoin(user, eq(user.id, memberProfiles.userId))
      .where(
        and(
          eq(user.disabled, false),
          eq(memberProfiles.isMember, true),
          eq(memberProfiles.showOnAbout, true),
        ),
      )
      .orderBy(asc(memberProfiles.sortOrder), asc(user.name));

    return rows;
  }),

  getMe: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const [profile] = await db
      .select({
        name: user.name,
        role: memberProfiles.role,
        photoUrl: memberProfiles.photoUrl,
        testimony: memberProfiles.testimony,
        isMember: memberProfiles.isMember,
        showOnAbout: memberProfiles.showOnAbout,
      })
      .from(user)
      .leftJoin(memberProfiles, eq(memberProfiles.userId, user.id))
      .where(eq(user.id, userId));

    return profile;
  }),

  updateMe: protectedProcedure
    .input(updateMyProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const [existing] = await db
        .select()
        .from(memberProfiles)
        .where(eq(memberProfiles.userId, userId));

      let photoUrl = existing?.photoUrl ?? null;
      let storagePath = existing?.storagePath ?? null;

      if (input.photo) {
        const uploaded = await uploadImageToStorage({
          dataUrl: input.photo,
          folder: `members/${userId}`,
          fileName: `photo-${Date.now()}.jpg`,
        });

        if (storagePath) {
          await deleteImageFromStorage(storagePath).catch(() => undefined);
        }

        photoUrl = uploaded.imageUrl;
        storagePath = uploaded.storagePath;
      } else if (input.removePhoto) {
        if (storagePath) {
          await deleteImageFromStorage(storagePath).catch(() => undefined);
        }

        photoUrl = null;
        storagePath = null;
      }

      await db
        .update(user)
        .set({ name: input.name.trim(), updatedAt: new Date() })
        .where(eq(user.id, userId));

      if (existing) {
        await db
          .update(memberProfiles)
          .set({
            testimony: input.testimony?.trim() || null,
            photoUrl,
            storagePath,
            updatedAt: new Date(),
          })
          .where(eq(memberProfiles.userId, userId));
      } else {
        await db.insert(memberProfiles).values({
          userId,
          testimony: input.testimony?.trim() || null,
          photoUrl,
          storagePath,
        });
      }

      const name = input.name.trim();
      const changes = diffFields(
        { name: ctx.session.user.name },
        { name },
      );

      if (input.photo) {
        changes.push({
          field: "photo",
          from: existing?.photoUrl ? "set" : "empty",
          to: "updated",
        });
      } else if (input.removePhoto && existing?.photoUrl) {
        changes.push({
          field: "photo",
          from: "set",
          to: "removed",
        });
      }

      if (changes.length > 0) {
        await writeAuditLog({
          actor: ctx.session.user,
          action: AUDIT_ACTIONS.MEMBERS_UPDATE_ME,
          entityType: "member_profile",
          entityId: userId,
          metadata: {
            name,
            changes,
          },
        });
      }

      return { success: true };
    }),

  updateFlags: requireCapability("users:manage")
    .input(updateMemberFlagsSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(memberProfiles)
        .where(eq(memberProfiles.userId, input.userId));

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Perfil não encontrado.",
        });
      }

      const [updated] = await db
        .update(memberProfiles)
        .set({
          role: input.role?.trim() || null,
          isMember: input.isMember,
          showOnAbout: input.isMember ? input.showOnAbout : false,
          updatedAt: new Date(),
        })
        .where(eq(memberProfiles.userId, input.userId))
        .returning();

      if (updated) {
        const [target] = await db
          .select({ name: user.name })
          .from(user)
          .where(eq(user.id, input.userId));

        const changes = diffFields(
          {
            ministryRole: existing.role,
            isMember: existing.isMember,
            showOnAbout: existing.showOnAbout,
          },
          {
            ministryRole: updated.role,
            isMember: updated.isMember,
            showOnAbout: updated.showOnAbout,
          },
        );

        if (changes.length > 0) {
          await writeAuditLog({
            actor: ctx.session.user,
            action: AUDIT_ACTIONS.MEMBERS_UPDATE_FLAGS,
            entityType: "member_profile",
            entityId: input.userId,
            metadata: {
              name: target?.name,
              changes,
            },
          });
        }
      }

      return updated;
    }),
});
