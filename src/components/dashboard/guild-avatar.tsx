import { initials } from '../../lib/guild';

const SIZES = { sm: 24, md: 32, lg: 40 };

interface GuildAvatarProps {
  name: string;
  iconUrl: string | null;
  size?: keyof typeof SIZES;
}

export function GuildAvatar({ name, iconUrl, size = 'md' }: GuildAvatarProps) {
  const className = `avatar avatar--square avatar--${size}`;
  return iconUrl ? (
    <img class={className} src={iconUrl} alt="" width={SIZES[size]} height={SIZES[size]} />
  ) : (
    <span class={className} aria-hidden="true">{initials(name)}</span>
  );
}
