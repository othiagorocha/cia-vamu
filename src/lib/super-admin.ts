export const SUPER_ADMIN_EMAIL = "thiagosrocha98@gmail.com";

export const isSuperAdminEmail = (email: string | null | undefined) => {
  const normalized = email?.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  if (normalized === SUPER_ADMIN_EMAIL) {
    return true;
  }

  const fromEnv = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  return Boolean(fromEnv && normalized === fromEnv);
};
