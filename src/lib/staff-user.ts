import { generateId } from "better-auth";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { account, user } from "@/db/auth-schema";
import { ALL_CAPABILITIES, type SiteCapability } from "@/lib/permissions";

export class StaffUserError extends Error {
  constructor(
    message: string,
    readonly code: "CONFLICT" | "NOT_FOUND" = "CONFLICT",
  ) {
    super(message);
    this.name = "StaffUserError";
  }
}

type CreateStaffUserInput = {
  name: string;
  email: string;
  password: string;
  capabilities: SiteCapability[];
};

export const createStaffUser = async (input: CreateStaffUserInput) => {
  const email = input.email.toLowerCase().trim();
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email));

  if (existing) {
    throw new StaffUserError("Já existe um usuário com este e-mail.");
  }

  const userId = generateId();
  const now = new Date();
  const passwordHash = await hashPassword(input.password);

  await db.transaction(async (tx) => {
    await tx.insert(user).values({
      id: userId,
      name: input.name.trim(),
      email,
      emailVerified: true,
      capabilities: input.capabilities,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(account).values({
      id: generateId(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });
  });

  const [created] = await db.select().from(user).where(eq(user.id, userId));

  if (!created) {
    throw new StaffUserError("Não foi possível criar o usuário.", "NOT_FOUND");
  }

  return created;
};

export const setStaffPassword = async (userId: string, password: string) => {
  const passwordHash = await hashPassword(password);
  const now = new Date();

  const [existing] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")));

  if (!existing) {
    await db.insert(account).values({
      id: generateId(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });
    return;
  }

  await db
    .update(account)
    .set({ password: passwordHash, updatedAt: now })
    .where(eq(account.id, existing.id));
};

export const ensureGestorCapabilities = async (email: string) => {
  await db
    .update(user)
    .set({
      capabilities: ALL_CAPABILITIES,
      updatedAt: new Date(),
    })
    .where(eq(user.email, email.toLowerCase().trim()));
};
