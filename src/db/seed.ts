import { config } from "dotenv";

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
  const { auth } = await import("@/lib/auth");

  const result = await auth.api.signUpEmail({
    body: { email, password, name },
  });

  console.log(`Usuário admin criado: ${result.user.email}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Falha ao criar usuário admin:", error.message ?? error);
    process.exit(1);
  });
