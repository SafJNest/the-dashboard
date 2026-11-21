import { $, component$, Slot, useContext, useSignal, useTask$, useVisibleTask$ } from '@qwik.dev/core';
import { Link } from '@qwik.dev/router';
import { creatorPath, likeShare, playCommand, soundPath, SOUNDS_PATH, type CatalogVote, type CommentPage, type SoundCard, type SoundVoteResult } from '../../lib/catalog';
import { useSoundComments } from '../../lib/catalog-loaders';
import { peekValue } from '../../lib/loader-value';
import { SoundLibrary } from '../../lib/sound-library';
import { formatCount, formatLength } from '../../lib/sound-stats';
import { useGlobalGreet } from '../../routes/sounds/layout';
import { Icon } from '../dashboard/icons';
import { Skeleton } from '../skeleton/skeleton';
import { LoadError } from '../sounds/library-states';
import { SoundPlayerContext } from '../sounds/sound-player';
import { SoundWave } from '../sounds/sound-wave';
import { AddToBoard } from './add-to-board';
import { SearchContext } from './catalog-context';
import { loadComments, recordPlay, voteSound } from './catalog-server';
import { CommentsSkeleton, FactsSkeleton } from './catalog-states';
import { Comments } from './comments';
import { CopyCommand, CopyLink } from './copy-buttons';
import { LoginGate } from './login-gate';
import { revealPanel } from './panel-bar';
import { PersonAvatar, SoundThumb } from './sound-items';

export type PanelMode = 'public' | 'server' | 'owner';

interface SoundPanelProps {
  sound: SoundCard;
  live: SoundCard | null;
  mode: PanelMode;
  signedIn: boolean;
  loginHref: string;
  greetId?: string | null;
  uploadedIn?: string | null;
  comments: 'loader' | 'lazy' | 'none';
}

const VOTE_FAILED = 'Your vote could not be sent. Please try again.';
const GREET_FAILED = 'Your greet could not be saved. Please try again.';
const COMMENTS_FAILED = 'Comments could not be loaded. Please try again.';
const DATE_FORMAT: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };

const LoaderComments = component$<{ live: SoundCard | null; soundId: string; loginHref: string; signedIn: boolean }>(({ live, soundId, loginHref, signedIn }) => {
  const loader = useSoundComments();
  const value = peekValue(loader);
  const current = value?.soundId === soundId ? value : undefined;
  if ( current?.failed ) { return <LoadError message={current.message} retrying={loader.pending} onRetry$={$(() => loader.invalidate())} />; }
  if ( !current?.page || !live ) { return <CommentsSkeleton />; }
  return <Comments key={soundId} target={{ kind: 'sound', id: soundId }} commentCount={live.commentCount} seed={current.page} signedIn={signedIn} soundOwned={live.viewer?.ownedByMe === true} loginHref={loginHref} />;
});

export const LazyComments = component$<{ kind: 'sound' | 'soundboard'; id: string; count: number; owned: boolean; loginHref: string }>(({ kind, id, count, owned, loginHref }) => {
  const page = useSignal<CommentPage | null>(null);
  const loading = useSignal(false);
  const error = useSignal<string | null>(null);

  const open = $(async () => {
    loading.value = true;
    error.value = null;
    const result = await loadComments({ kind, id }, {}).catch(() => null);
    loading.value = false;
    if ( !result?.ok ) { error.value = result?.message ?? COMMENTS_FAILED; return; }
    page.value = result.data;
  });

  if ( page.value ) { return <Comments target={{ kind, id }} commentCount={count} seed={page.value} signedIn soundOwned={owned} loginHref={loginHref} />; }
  return (
    <section class="comments">
      <button type="button" class="button button--secondary button--sm" disabled={loading.value} aria-busy={loading.value} onClick$={open}>
        <Icon name="message" />{loading.value ? 'Loading comments…' : `Show ${formatCount(count)} ${count === 1 ? 'comment' : 'comments'}`}
      </button>
      {error.value && <p class="callout callout--danger" role="alert">{error.value}</p>}
    </section>
  );
});

const GlobalGreet = component$<{ soundId: string; greetId: string | null; signedIn: boolean; loginHref: string }>(({ soundId, greetId, signedIn, loginHref }) => {
  const action = useGlobalGreet();
  const saved = useSignal<string | null | undefined>(undefined);
  const gate = useSignal(false);
  const error = useSignal<string | null>(null);
  const current = saved.value === undefined ? greetId : saved.value;
  const isGreet = current === soundId;

  const toggle = $(async () => {
    if ( !signedIn ) { gate.value = true; return; }
    if ( action.isRunning ) { return; }
    const next = isGreet ? null : soundId;
    error.value = null;
    const outcome = await action.submit({ soundId: next ?? '' }).catch(() => null);
    if ( !outcome ) { error.value = GREET_FAILED; return; }
    if ( !outcome.value.ok ) { error.value = outcome.value.message; return; }
    saved.value = next;
  });

  return (
    <span class="catalog-anchor">
      <button type="button" class="button button--secondary" aria-pressed={isGreet} aria-busy={action.isRunning} disabled={action.isRunning} onClick$={toggle}>
        <Icon name="greet" />{isGreet ? 'Your global greet' : 'Set as greet'}
      </button>
      {gate.value && <LoginGate title="Log in to set a greet" text="Beebot plays your greet when you join a voice channel." loginHref={loginHref} onClose$={() => (gate.value = false)} />}
      {error.value && <span class="callout callout--danger" role="alert">{error.value}</span>}
    </span>
  );
});

export const SoundPanel = component$<SoundPanelProps>(({ sound, live, mode, signedIn, loginHref, greetId = null, uploadedIn = null, comments }) => {
  const search = useContext(SearchContext);
  const player = useContext(SoundPlayerContext);
  const panel = useSignal<HTMLElement>();
  const playbackId = useSignal<string | null>(null);
  const voted = useSignal<SoundVoteResult | null>(null);
  const gate = useSignal(false);
  const error = useSignal<string | null>(null);
  const voting = useSignal(false);
  const current = player.state.soundId === sound.id;
  const playing = current && player.state.playing;
  const owned = (live ?? sound).viewer?.ownedByMe === true;
  const isPublic = mode === 'public';

  useVisibleTask$(() => revealPanel(panel.value), { strategy: 'document-ready' });

  useTask$(({ track }) => {
    const started = track(() => player.state.soundId === sound.id && player.state.playing);
    const ended = track(() => player.state.soundId === sound.id && player.state.ended);
    ended && (playbackId.value = null);
    if ( mode === 'owner' || !started || playbackId.value ) { return; }
    playbackId.value = crypto.randomUUID();
    recordPlay(sound.id, playbackId.value, null).then(
      (result) => !result.ok && console.error('[SoundPanel] Play not recorded.', result.message),
      (failure: unknown) => console.error('[SoundPanel] Play not recorded.', failure),
    );
  });

  const votes = voted.value ?? (live ? { likes: live.likes, dislikes: live.dislikes, vote: live.viewer?.vote ?? null } : null);

  const react = $(async (next: Exclude<CatalogVote, null>) => {
    if ( !signedIn ) { gate.value = true; return; }
    if ( voting.value || !votes ) { return; }
    voting.value = true;
    error.value = null;
    const result = await voteSound(sound.id, votes.vote === next ? null : next).catch(() => null);
    voting.value = false;
    if ( !result ) { error.value = VOTE_FAILED; return; }
    if ( !result.ok ) { error.value = result.message; return; }
    voted.value = result.data;
  });

  const share = votes ? likeShare(votes.likes, votes.dislikes) : null;
  const uploaded = sound.createdAt ? new Date(sound.createdAt).toLocaleDateString('en-US', DATE_FORMAT) : null;
  const place = [uploadedIn ? `in ${uploadedIn}` : null, uploaded].filter(Boolean).join(' · ');
  const origin = place ? `Uploaded ${place}` : null;
  const manageLabel = mode === 'public' ? 'Manage in My sounds' : 'Edit in My sounds';
  const showManage = owned && mode !== 'owner';
  const showPublicPage = mode === 'owner' && sound.public;

  return (
    <article ref={panel} class="catalog-panel__body" aria-label={sound.name}>
      <div class="sound-card__main">
        <div class="sound-card__head">
          <SoundThumb sound={live ?? sound} size="lg" />
          <div class="sound-card__meta">
            {mode === 'owner' ? <Slot name="title" /> : <h2 class="display sound-card__title">{sound.name}</h2>}
            <a href={creatorPath(sound.uploader.id)} class="sound-card__by">
              <PersonAvatar user={sound.uploader} size={24} />
              {owned ? 'You' : sound.uploader.name}
            </a>
            <span class="catalog-who">
              {!sound.public && <span class="badge">Private</span>}
              {origin && <span>{origin}</span>}
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
          {isPublic && (
            <div class="catalog-anchor">
              <div class="catalog-react" role="group" aria-label={`Rate ${sound.name}`} aria-busy={!votes || voting.value}>
                <button type="button" class="catalog-react__button" aria-pressed={votes?.vote === 'LIKE'} aria-label={votes ? `Like, ${votes.likes} likes` : 'Like'} disabled={!votes} onClick$={() => react('LIKE')}>
                  <Icon name="heart" />{votes ? formatCount(votes.likes) : <Skeleton width="2ch" />}
                </button>
                <button type="button" class="catalog-react__button catalog-react__button--down" aria-pressed={votes?.vote === 'DISLIKE'} aria-label={votes ? `Dislike, ${votes.dislikes} dislikes` : 'Dislike'} disabled={!votes} onClick$={() => react('DISLIKE')}>
                  <Icon name="dislike" />{votes ? formatCount(votes.dislikes) : <Skeleton width="2ch" />}
                </button>
              </div>
              {gate.value && <LoginGate title="Log in to rate sounds" text="Likes push good sounds up in search. One click with Discord." loginHref={loginHref} onClose$={() => (gate.value = false)} />}
            </div>
          )}
          <AddToBoard soundId={sound.id} soundName={sound.name} signedIn={signedIn} loginHref={loginHref} />
          {isPublic ? <GlobalGreet soundId={sound.id} greetId={greetId} signedIn={signedIn} loginHref={loginHref} /> : <Slot name="greet" />}
          {sound.public && <CopyLink path={soundPath(sound.id)} />}
          <CopyCommand command={playCommand(sound.id)} />
          {showManage && <a href={SoundLibrary.myPath(sound.id)} class="button button--secondary"><Icon name="edit" />{manageLabel}</a>}
          {showPublicPage && <a href={soundPath(sound.id)} class="button button--secondary"><Icon name="link" />Public page</a>}
        </div>
        {error.value && <p class="callout callout--danger" role="alert">{error.value}</p>}

        {sound.description && mode !== 'owner' && <p class="sound-card__description">{sound.description}</p>}

        {isPublic && (live ? (
          <dl class="catalog-facts">
            <div><dt>Plays</dt><dd>{formatCount(live.plays)}</dd></div>
            <div><dt>Listeners</dt><dd>{formatCount(live.listeners)}</dd></div>
            <div><dt>Liked by</dt><dd>{share === null ? '—' : `${share}%`}</dd></div>
          </dl>
        ) : (
          <FactsSkeleton />
        ))}

        {isPublic && sound.tags.length > 0 && (
          <div class="catalog-filters__tags" aria-label="Tags">
            {sound.tags.map((tag) => (
              <Link key={tag.id} href={`${SOUNDS_PATH}/`} class="catalog-tag" prefetchData="off" onClick$={() => {
                search.tag = tag.name;
                search.submitted = '';
                search.query = '';
              }}>#{tag.name}</Link>
            ))}
          </div>
        )}

        <Slot name="owner" />
      </div>

      {comments === 'loader' && <LoaderComments live={live} soundId={sound.id} loginHref={loginHref} signedIn={signedIn} />}
      {comments === 'lazy' && sound.public && <LazyComments kind="sound" id={sound.id} count={live?.commentCount ?? 0} owned={owned} loginHref={loginHref} />}
    </article>
  );
});
