export const SUPER_ADMIN_EMAIL = "thiagosrocha98@gmail.com";

export const isSuperAdminEmail = (email: string | null | undefined) =>
  email?.trim().toLowerCase() === SUPER_ADMIN_EMAIL;
