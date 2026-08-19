import { TRPCError } from "@trpc/server";

import {
  clearMustChangePassword,
  isSameStaffPassword,
  setStaffPassword,
} from "@/lib/staff-user";
import { changeOwnPasswordSchema } from "@/modules/auth/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const authRouter = createTRPCRouter({
  changeOwnPassword: protectedProcedure
    .input(changeOwnPasswordSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.mustChangePassword) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Não é necessário redefinir a senha agora.",
        });
      }

      const sameAsTemporary = await isSameStaffPassword(
        ctx.session.user.id,
        input.password,
      );

      if (sameAsTemporary) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A nova senha deve ser diferente da senha temporária.",
        });
      }

      await setStaffPassword(ctx.session.user.id, input.password);
      await clearMustChangePassword(ctx.session.user.id);

      return { success: true };
    }),
});
