import { component$, useContext, type QRL } from '@qwik.dev/core';
import { Link } from '@qwik.dev/router';
import type { SoundCard } from '../../lib/catalog';
import { formatCompact, formatLength } from '../../lib/sound-stats';
import type { SoundUser } from '../../lib/sounds';
import { Icon } from '../dashboard/icons';
import { SoundPlayerContext } from '../sounds/sound-player';
import { SearchContext } from './catalog-context';

export function Highlight({ text, query }: { text: string; query: string }) {
  const index = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if ( index < 0 ) { return <span class="catalog-name">{text}</span>; }
  return (
    <span class="catalog-name catalog-mark">
      {text.slice(0, index)}
      <mark>{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </span>
  );
}

export function SoundThumb({ sound, size }: { sound: Pick<SoundCard, 'imageUrl' | 'name'>; size?: 'sm' | 'lg' | 'fill' }) {
  return (
    <span class={['sound-thumb', size && `sound-thumb--${size}`]} aria-hidden="true">
      {sound.imageUrl ? <img src={sound.imageUrl} alt="" width={88} height={88} loading="lazy" /> : <Icon name="sounds" />}
    </span>
  );
}

export function PersonAvatar({ user, size }: { user: SoundUser; size: number }) {
  const style = { '--avatar-size': `${size / 16}rem` };
  if ( user.avatarUrl ) { return <img class="avatar" src={user.avatarUrl} alt="" width={size} height={size} style={style} />; }
  return <span class="avatar avatar--violet" style={style} aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>;
}

interface SoundRowProps {
  sound: SoundCard;
  href: string;
  query?: string;
  current: boolean;
  showUploader?: boolean;
  onPlay$: QRL<(sound: SoundCard) => void>;
}

export const SoundRow = component$<SoundRowProps>(({ sound, href, query = '', current, showUploader = true, onPlay$ }) => {
  const search = useContext(SearchContext);
  const player = useContext(SoundPlayerContext);
  const playing = player.state.soundId === sound.id && player.state.playing;
  return (
    <div class="catalog-row" aria-current={current ? 'page' : undefined}>
      <Link href={href} class="catalog-row__link" aria-label={`Open ${sound.name}`} prefetchData="off" scroll={false} onClick$={() => (search.preview = sound)} />
      <button type="button" class="play catalog-row__play" aria-label={`${playing ? 'Pause' : 'Play'} ${sound.name}`} aria-busy={player.state.soundId === sound.id && player.state.loading} onClick$={() => onPlay$(sound)}>
        <Icon name={playing ? 'pause' : 'play'} />
      </button>
      <SoundThumb sound={sound} />
      <span class="catalog-row__main">
        <Highlight text={sound.name} query={query} />
        <span class="catalog-who">
          {showUploader && <PersonAvatar user={sound.uploader} size={16} />}
          {showUploader && <span class="catalog-who__name">{sound.uploader.name}</span>}
          {sound.tags.length > 0 && <span class="catalog-row__tags">{sound.tags.slice(0, 2).map((tag) => `#${tag.name}`).join(' ')}</span>}
        </span>
      </span>
      <span class="catalog-row__nums">
        <span class="catalog-length">{formatLength(sound.durationMs)}</span>
        <span class="catalog-row__optional"><Icon name="play" />{formatCompact(sound.plays)}</span>
        <span><Icon name="heart" />{formatCompact(sound.likes)}</span>
        <span class="catalog-row__optional"><Icon name="message" />{formatCompact(sound.commentCount)}</span>
      </span>
    </div>
  );
});

export const SoundTile = component$<{ sound: SoundCard; href: string }>(({ sound, href }) => {
  const search = useContext(SearchContext);
  return (
    <Link href={href} class="catalog-tile" prefetchData="off" scroll={false} onClick$={() => (search.preview = sound)}>
      <SoundThumb sound={sound} size="fill" />
      <span class="catalog-name">{sound.name}</span>
      <span class="catalog-who">
        <PersonAvatar user={sound.uploader} size={16} />
        <span>{sound.uploader.name}</span>
      </span>
      <span class="caption">{formatCompact(sound.plays)} plays · {formatCompact(sound.likes)} likes</span>
    </Link>
  );
});
