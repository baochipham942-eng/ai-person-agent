export function normalizePublicAvatarUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleanUrl = value.split('?')[0];
  return value.startsWith('/avatars/') && cleanUrl.endsWith('.webp') ? value : null;
}
