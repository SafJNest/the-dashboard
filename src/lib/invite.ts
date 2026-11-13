export function discordInviteUrl(clientId: string | undefined) {
  if (!clientId) {
    return null;
  }
  const params = new URLSearchParams({ client_id: clientId, scope: 'bot applications.commands' });
  return `https://discord.com/oauth2/authorize?${params}`;
}
