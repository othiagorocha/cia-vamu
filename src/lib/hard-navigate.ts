export function hardNavigate(path: string) {
  window.location.assign(path);
}

export function getSafeAdminRedirect(value: string | null): string {
  if (!value?.startsWith("/admin") || value.startsWith("//")) {
    return "/admin";
  }

  return value;
}
