import { config } from "dotenv";
import { eq } from "drizzle-orm";

config({ path: ".env.local", override: true });

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Administrador CIA VAMU";

  if (!email || !password) {
    throw new Error(
      "Defina ADMIN_EMAIL e ADMIN_PASSWORD no .env.local antes de rodar o seed.",
    );
  }

  // Import dinâmico: garante que o dotenv rode antes do client do DB.
  const { user } = await import("@/db/auth-schema");
  const { db } = await import("@/db");
  const { ALL_CAPABILITIES } = await import("@/lib/permissions");
  const { createStaffUser, ensureGestorCapabilities } = await import(
    "@/lib/staff-user"
  );

  const normalizedEmail = email.toLowerCase().trim();
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, normalizedEmail));

  if (existing) {
    await ensureGestorCapabilities(normalizedEmail);
    const { memberProfiles } = await import("@/db/schema");
    await db
      .insert(memberProfiles)
      .values({ userId: existing.id, isMember: false, showOnAbout: false })
      .onConflictDoNothing();
    console.log(`Usuário admin atualizado: ${normalizedEmail}`);
    return;
  }

  await createStaffUser({
    name,
    email: normalizedEmail,
    password,
    capabilities: ALL_CAPABILITIES,
  });

  console.log(`Usuário admin criado: ${normalizedEmail}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Falha ao criar usuário admin:", error.message ?? error);
    process.exit(1);
  });
