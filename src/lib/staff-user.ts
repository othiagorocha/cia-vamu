import { generateId } from "better-auth";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { account, session, user } from "@/db/auth-schema";
import { memberProfiles } from "@/db/schema";
import { auth } from "@/lib/auth";
import { ALL_CAPABILITIES, type SiteCapability } from "@/lib/permissions";

const hashStaffPassword = async (password: string) => {
  const ctx = await auth.$context;
  return ctx.password.hash(password);
};

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
  mustChangePassword?: boolean;
};

type StaffExecutor = Pick<typeof db, "select" | "insert">;

const insertStaffUser = async (
  executor: StaffExecutor,
  input: CreateStaffUserInput,
) => {
  const email = input.email.toLowerCase().trim();
  const [existing] = await executor
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email));

  if (existing) {
    throw new StaffUserError("Já existe um usuário com este e-mail.");
  }

  const userId = generateId();
  const now = new Date();
  const passwordHash = await hashStaffPassword(input.password);

  await executor.insert(user).values({
    id: userId,
    name: input.name.trim(),
    email,
    emailVerified: true,
    capabilities: input.capabilities,
    disabled: false,
    mustChangePassword: input.mustChangePassword ?? true,
    createdAt: now,
    updatedAt: now,
  });

  await executor.insert(account).values({
    id: generateId(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: passwordHash,
    createdAt: now,
    updatedAt: now,
  });

  await executor.insert(memberProfiles).values({
    userId,
    isMember: false,
    showOnAbout: false,
  });

  const [created] = await executor
    .select()
    .from(user)
    .where(eq(user.id, userId));

  if (!created) {
    throw new StaffUserError("Não foi possível criar o usuário.", "NOT_FOUND");
  }

  return created;
};

export const createStaffUser = async (
  input: CreateStaffUserInput,
  executor: StaffExecutor = db,
) => {
  if (executor === db) {
    return db.transaction((tx) => insertStaffUser(tx, input));
  }

  return insertStaffUser(executor, input);
};

type SetStaffPasswordOptions = {
  requirePasswordChange?: boolean;
};

export const setStaffPassword = async (
  userId: string,
  password: string,
  options: SetStaffPasswordOptions = {},
) => {
  const passwordHash = await hashStaffPassword(password);
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
  } else {
    await db
      .update(account)
      .set({ password: passwordHash, updatedAt: now })
      .where(eq(account.id, existing.id));
  }

  if (options.requirePasswordChange) {
    await db
      .update(user)
      .set({ mustChangePassword: true, updatedAt: now })
      .where(eq(user.id, userId));
    await db.delete(session).where(eq(session.userId, userId));
  }
};

export const isSameStaffPassword = async (userId: string, password: string) => {
  const [existing] = await db
    .select({ password: account.password })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")));

  if (!existing?.password) {
    return false;
  }

  const ctx = await auth.$context;
  return ctx.password.verify({ hash: existing.password, password });
};

export const clearMustChangePassword = async (userId: string) => {
  await db
    .update(user)
    .set({ mustChangePassword: false, updatedAt: new Date() })
    .where(eq(user.id, userId));
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
