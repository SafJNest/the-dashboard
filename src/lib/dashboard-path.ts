export function settingsPath(guildId: string, ...segments: string[]) {
  return `/dashboard/${guildId}/settings/${segments.map((segment) => `${encodeURIComponent(segment)}/`).join('')}`;
}

export function settingsSection(pathname: string) {
  return pathname.split('/')[4] || undefined;
}

export function selectionRedirect(url: URL, legacyParam: string, guildId: string, section: string, item: string | undefined) {
  const legacy = url.searchParams.get(legacyParam);
  if (legacy === null) return null;
  const search = new URLSearchParams(url.search);
  search.delete(legacyParam);
  const query = search.toString();
  const target = item ?? (legacy || undefined);
  return `${target ? settingsPath(guildId, section, target) : settingsPath(guildId, section)}${query ? `?${query}` : ''}`;
}

export function pageKey(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[2] === 'sounds' && parts.at(-1) !== 'edit') return parts.slice(0, 3).join('/');
  if (parts[2] === 'settings' && (parts[3] === 'rewards' || parts[3] === 'twitch')) return parts.slice(0, 4).join('/');
  return parts.join('/');
}
