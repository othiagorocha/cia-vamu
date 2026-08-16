import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/db/auth-schema";
import { parseCapabilities } from "@/lib/permissions";
import {
  createStaffUser,
  setStaffPassword,
  StaffUserError,
} from "@/lib/staff-user";
import {
  createStaffSchema,
  removeStaffSchema,
  setStaffPasswordSchema,
  updateStaffSchema,
} from "@/modules/staff/schema";
import type { StaffRecord } from "@/modules/staff/types";
import { createTRPCRouter, requireCapability } from "@/trpc/init";

const toStaffRecord = (row: {
  id: string;
  name: string;
  email: string;
  capabilities: string[];
  createdAt: Date;
}): StaffRecord => ({
  id: row.id,
  name: row.name,
  email: row.email,
  capabilities: parseCapabilities(row.capabilities),
  createdAt: row.createdAt,
});

const countGestores = async (excludeUserId?: string) => {
  const rows = await db
    .select({ id: user.id, capabilities: user.capabilities })
    .from(user);

  return rows.filter((row) => {
    if (excludeUserId && row.id === excludeUserId) {
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
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt));

    return rows.map(toStaffRecord);
  }),

  create: requireCapability("users:manage")
    .input(createStaffSchema)
    .mutation(async ({ input }) => {
      try {
        const created = await createStaffUser(input);
        return toStaffRecord(created);
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

      return toStaffRecord(updated);
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

      if (isGestor) {
        const remainingGestores = await countGestores(input.id);

        if (remainingGestores === 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "É preciso manter pelo menos um gestor na equipe.",
          });
        }
      }

      await db.delete(user).where(eq(user.id, input.id));
      return { success: true };
    }),
});
