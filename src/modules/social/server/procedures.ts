import { TRPCError } from "@trpc/server";
import { asc, desc, eq, gt, lt } from "drizzle-orm";

import { db } from "@/db";
import { socialLinks } from "@/db/schema";
import { AUDIT_ACTIONS } from "@/modules/audit/actions";
import { diffFields } from "@/modules/audit/diff";
import { writeAuditLog } from "@/modules/audit/server/write-audit-log";
import {
  createSocialLinkSchema,
  removeSocialLinkSchema,
  reorderSocialLinkSchema,
  updateSocialLinkSchema,
} from "@/modules/social/schema";
import {
  baseProcedure,
  createTRPCRouter,
  requireCapability,
} from "@/trpc/init";

export const socialRouter = createTRPCRouter({
  listPublished: baseProcedure.query(async () => {
    return db
      .select()
      .from(socialLinks)
      .where(eq(socialLinks.published, true))
      .orderBy(asc(socialLinks.sortOrder), asc(socialLinks.createdAt));
  }),

  listAll: requireCapability("site:write").query(async () => {
    return db
      .select()
      .from(socialLinks)
      .orderBy(asc(socialLinks.sortOrder), asc(socialLinks.createdAt));
  }),

  create: requireCapability("site:write")
    .input(createSocialLinkSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await db.select({ id: socialLinks.id }).from(socialLinks);

      const [created] = await db
        .insert(socialLinks)
        .values({
          platform: input.platform,
          label: input.label.trim(),
          url: input.url.trim(),
          iconName: input.platform === "other" ? input.iconName : null,
          published: input.published,
          sortOrder: existing.length,
        })
        .returning();

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.SOCIAL_CREATE,
        entityType: "social_link",
        entityId: created.id,
        metadata: {
          label: created.label,
          published: created.published,
          platform: created.platform,
        },
      });

      return created;
    }),

  update: requireCapability("site:write")
    .input(updateSocialLinkSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(socialLinks)
        .where(eq(socialLinks.id, input.id));

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rede social não encontrada.",
        });
      }

      const [updated] = await db
        .update(socialLinks)
        .set({
          platform: input.data.platform,
          label: input.data.label.trim(),
          url: input.data.url.trim(),
          iconName: input.data.platform === "other" ? input.data.iconName : null,
          published: input.data.published,
          updatedAt: new Date(),
        })
        .where(eq(socialLinks.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rede social não encontrada.",
        });
      }

      const changes = diffFields(
        {
          label: existing.label,
          published: existing.published,
          platform: existing.platform,
        },
        {
          label: updated.label,
          published: updated.published,
          platform: updated.platform,
        },
      );

      if (changes.length > 0) {
        await writeAuditLog({
          actor: ctx.session.user,
          action: AUDIT_ACTIONS.SOCIAL_UPDATE,
          entityType: "social_link",
          entityId: updated.id,
          metadata: {
            label: updated.label,
            changes,
          },
        });
      }

      return updated;
    }),

  remove: requireCapability("site:write")
    .input(removeSocialLinkSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select({
          id: socialLinks.id,
          label: socialLinks.label,
        })
        .from(socialLinks)
        .where(eq(socialLinks.id, input.id));

      await db.delete(socialLinks).where(eq(socialLinks.id, input.id));

      if (existing) {
        await writeAuditLog({
          actor: ctx.session.user,
          action: AUDIT_ACTIONS.SOCIAL_REMOVE,
          entityType: "social_link",
          entityId: existing.id,
          metadata: { label: existing.label },
        });
      }

      return { success: true };
    }),

  reorder: requireCapability("site:write")
    .input(reorderSocialLinkSchema)
    .mutation(async ({ ctx, input }) => {
      const [current] = await db
        .select()
        .from(socialLinks)
        .where(eq(socialLinks.id, input.id));

      if (!current) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rede social não encontrada.",
        });
      }

      const neighbors =
        input.direction === "up"
          ? await db
              .select()
              .from(socialLinks)
              .where(lt(socialLinks.sortOrder, current.sortOrder))
              .orderBy(desc(socialLinks.sortOrder))
              .limit(1)
          : await db
              .select()
              .from(socialLinks)
              .where(gt(socialLinks.sortOrder, current.sortOrder))
              .orderBy(asc(socialLinks.sortOrder))
              .limit(1);

      const neighbor = neighbors[0];

      if (!neighbor) {
        return current;
      }

      await db
        .update(socialLinks)
        .set({ sortOrder: neighbor.sortOrder, updatedAt: new Date() })
        .where(eq(socialLinks.id, current.id));
      await db
        .update(socialLinks)
        .set({ sortOrder: current.sortOrder, updatedAt: new Date() })
        .where(eq(socialLinks.id, neighbor.id));

      await writeAuditLog({
        actor: ctx.session.user,
        action: AUDIT_ACTIONS.SOCIAL_REORDER,
        entityType: "social_link",
        entityId: current.id,
        metadata: {
          label: current.label,
          direction: input.direction,
        },
      });

      return { success: true };
    }),
});
