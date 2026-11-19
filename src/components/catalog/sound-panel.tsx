import { $, component$, useContext, useSignal, useTask$, useVisibleTask$ } from '@qwik.dev/core';
import { Link } from '@qwik.dev/router';
import { likeShare, playCommand, SOUNDS_PATH, type CatalogVote, type SoundCard, type SoundVoteResult } from '../../lib/catalog';
import { useSoundComments } from '../../lib/catalog-loaders';
import { peekValue } from '../../lib/loader-value';
import { formatCount, formatLength } from '../../lib/sound-stats';
import { useGlobalGreet } from '../../routes/sounds/layout';
import { Icon } from '../dashboard/icons';
import { Skeleton } from '../skeleton/skeleton';
import { LoadError } from '../sounds/library-states';
import { SoundPlayerContext } from '../sounds/sound-player';
import { SoundWave } from '../sounds/sound-wave';
import { SearchContext } from './catalog-context';
import { recordPlay, voteSound } from './catalog-server';
import { CommentsSkeleton, FactsSkeleton } from './catalog-states';
import { Comments } from './comments';
import { LoginGate } from './login-gate';
import { PersonAvatar, SoundThumb } from './sound-items';

type Gate = 'react' | 'greet' | null;

interface SoundPanelProps {
  sound: SoundCard;
  live: SoundCard | null;
  loginHref: string;
  signedIn: boolean;
  greetId: string | null;
}

const VOTE_FAILED = 'Your vote could not be sent. Please try again.';
const GREET_FAILED = 'Your greet could not be saved. Please try again.';

const GATES = {
  react: { title: 'Log in to rate sounds', text: 'Likes push good sounds up in search. One click with Discord.' },
  greet: { title: 'Log in to set a greet', text: 'Beebot plays your greet when you join a voice channel.' },
};

const CommentsBlock = component$<{ live: SoundCard | null; soundId: string; loginHref: string; signedIn: boolean }>(({ live, soundId, loginHref, signedIn }) => {
  const loader = useSoundComments();
  const value = peekValue(loader);
  const current = value?.soundId === soundId ? value : undefined;
  if ( current?.failed ) { return <LoadError message={current.message} retrying={loader.pending} onRetry$={$(() => loader.invalidate())} />; }
  if ( !current?.page || !live ) { return <CommentsSkeleton />; }
  return <Comments key={soundId} soundId={soundId} commentCount={live.commentCount} seed={current.page} signedIn={signedIn} soundOwned={live.viewer?.ownedByMe === true} loginHref={loginHref} />;
});

export const SoundPanel = component$<SoundPanelProps>(({ sound, live, loginHref, signedIn, greetId }) => {
  const search = useContext(SearchContext);
  const greetAction = useGlobalGreet();
  const player = useContext(SoundPlayerContext);
  const panel = useSignal<HTMLElement>();
  const playbackId = useSignal<string | null>(null);
  const voted = useSignal<SoundVoteResult | null>(null);
  const savedGreet = useSignal<string | null | undefined>(undefined);
  const gate = useSignal<Gate>(null);
  const copied = useSignal(false);
  const shared = useSignal(false);
  const error = useSignal<string | null>(null);
  const voting = useSignal(false);
  const current = player.state.soundId === sound.id;
  const playing = current && player.state.playing;

  useVisibleTask$(() => {
    const container = panel.value?.closest('.catalog-panel');
    const aboveViewport = (container?.getBoundingClientRect().top ?? 0) < 0;
    aboveViewport && container?.scrollIntoView({ block: 'start' });
  }, { strategy: 'document-ready' });

  useTask$(({ track }) => {
    const started = track(() => player.state.soundId === sound.id && player.state.playing);
    const ended = track(() => player.state.soundId === sound.id && player.state.ended);
    ended && (playbackId.value = null);
    if ( !started || playbackId.value ) { return; }
    playbackId.value = crypto.randomUUID();
    recordPlay(sound.id, playbackId.value).then(
      (result) => !result.ok && console.error('[SoundPanel] Play not recorded.', result.message),
      (error: unknown) => console.error('[SoundPanel] Play not recorded.', error),
    );
  });

  const votes = voted.value ?? (live ? { likes: live.likes, dislikes: live.dislikes, vote: live.viewer?.vote ?? null } : null);
  const currentGreet = savedGreet.value === undefined ? greetId : savedGreet.value;
  const greet = currentGreet === sound.id;

  const react = $(async (next: Exclude<CatalogVote, null>) => {
    if ( !signedIn ) { gate.value = 'react'; return; }
    if ( voting.value || !votes ) { return; }
    voting.value = true;
    error.value = null;
    const result = await voteSound(sound.id, votes.vote === next ? null : next).catch(() => null);
    voting.value = false;
    if ( !result ) { error.value = VOTE_FAILED; return; }
    if ( !result.ok ) { error.value = result.message; return; }
    voted.value = result.data;
  });

  const toggleGreet = $(async () => {
    if ( !signedIn ) { gate.value = 'greet'; return; }
    if ( greetAction.isRunning ) { return; }
    const next = greet ? null : sound.id;
    error.value = null;
    const outcome = await greetAction.submit({ soundId: next ?? '' }).catch(() => null);
    if ( !outcome ) { error.value = GREET_FAILED; return; }
    if ( !outcome.value.ok ) { error.value = outcome.value.message; return; }
    savedGreet.value = next;
  });

  const share = votes ? likeShare(votes.likes, votes.dislikes) : null;

  return (
    <article ref={panel} class="catalog-panel__body" aria-label={sound.name}>
      <div class="sound-card__main">
        <div class="sound-card__head">
          <SoundThumb sound={sound} size="lg" />
          <div class="sound-card__meta">
            <h2 class="display sound-card__title">{sound.name}</h2>
            <Link href={`${SOUNDS_PATH}/u/${sound.uploader.id}/`} class="sound-card__by">
              <PersonAvatar user={sound.uploader} size={24} />
              {sound.uploader.name}
            </Link>
            <span class="catalog-who">
              {!sound.public && <span class="badge">Private</span>}
              {sound.createdAt && <span>Uploaded {new Date(sound.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
            </span>
          </div>
        </div>

        <div class="sound-card__player">
          <button type="button" class="play play--lg" aria-label={`${playing ? 'Pause' : 'Play'} ${sound.name}`} aria-busy={current && player.state.loading} disabled={!sound.audioUrl} onClick$={() => player.toggle$(sound.id, sound.audioUrl)}>
            <Icon name={playing ? 'pause' : 'play'} />
          </button>
          <SoundWave key={sound.id} soundId={sound.id} url={sound.audioUrl} />
          <span class="caption catalog-length">{formatLength(sound.durationMs)}</span>
        </div>
        {player.state.failed === sound.id && <p class="callout callout--danger" role="alert">This sound could not be played.</p>}

        <div class="sound-card__row">
          <div class="catalog-anchor">
            <div class="catalog-react" role="group" aria-label={`Rate ${sound.name}`} aria-busy={!votes || voting.value}>
              <button type="button" class="catalog-react__button" aria-pressed={votes?.vote === 'LIKE'} aria-label={votes ? `Like, ${votes.likes} likes` : 'Like'} disabled={!votes} onClick$={() => react('LIKE')}>
                <Icon name="heart" />{votes ? formatCount(votes.likes) : <Skeleton width="2ch" />}
              </button>
              <button type="button" class="catalog-react__button catalog-react__button--down" aria-pressed={votes?.vote === 'DISLIKE'} aria-label={votes ? `Dislike, ${votes.dislikes} dislikes` : 'Dislike'} disabled={!votes} onClick$={() => react('DISLIKE')}>
                <Icon name="dislike" />{votes ? formatCount(votes.dislikes) : <Skeleton width="2ch" />}
              </button>
            </div>
            {gate.value === 'react' && <LoginGate {...GATES.react} loginHref={loginHref} onClose$={() => (gate.value = null)} />}
          </div>
          <button type="button" class="catalog-command" data-copied={copied.value || undefined} aria-label={`Copy command ${playCommand(sound.id)}`} onClick$={async () => {
            await navigator.clipboard.writeText(playCommand(sound.id));
            copied.value = true;
          }}>
            {playCommand(sound.id)}
            <span class="catalog-command__icon"><Icon name={copied.value ? 'check' : 'copy'} /></span>
          </button>
          <button type="button" class="button button--secondary" aria-label="Copy link" title={shared.value ? 'Link copied' : 'Copy link'} onClick$={async () => {
            await navigator.clipboard.writeText(window.location.href);
            shared.value = true;
          }}>
            <Icon name={shared.value ? 'check' : 'link'} />
          </button>
        </div>

        <div class="sound-card__row">
          <div class="catalog-anchor">
            <button type="button" class="button button--secondary" aria-pressed={greet} aria-busy={greetAction.isRunning} disabled={greetAction.isRunning} onClick$={toggleGreet}>
              <Icon name="greet" />{greet ? 'Your global greet' : 'Set as global greet'}
            </button>
            {gate.value === 'greet' && <LoginGate {...GATES.greet} loginHref={loginHref} onClose$={() => (gate.value = null)} />}
          </div>
          <span class="catalog-soon">
            <button type="button" class="button button--secondary" disabled title="Coming soon">
              <Icon name="soundboards" />Add to soundboard
            </button>
            <span class="badge">Coming soon</span>
          </span>
        </div>
        {error.value && <p class="callout callout--danger" role="alert">{error.value}</p>}

        {live ? (
          <dl class="catalog-facts">
            <div><dt>Plays</dt><dd>{formatCount(live.plays)}</dd></div>
            <div><dt>Listeners</dt><dd>{formatCount(live.listeners)}</dd></div>
            <div><dt>Length</dt><dd>{formatLength(live.durationMs)}</dd></div>
            <div><dt>Liked by</dt><dd>{share === null ? '—' : `${share}%`}</dd></div>
          </dl>
        ) : (
          <FactsSkeleton />
        )}

        {sound.tags.length > 0 && (
          <div class="catalog-filters__tags" aria-label="Tags">
            {sound.tags.map((tag) => (
              <Link key={tag.id} href={`${SOUNDS_PATH}/`} class="catalog-chip" prefetchData="off" onClick$={() => {
                search.tag = tag.name;
                search.submitted = '';
                search.query = '';
              }}>#{tag.name}</Link>
            ))}
          </div>
        )}
      </div>

      <CommentsBlock live={live} soundId={sound.id} loginHref={loginHref} signedIn={signedIn} />
    </article>
  );
});
