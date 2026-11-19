import { $, component$, useSignal, useStore, type QRL, type Signal } from '@qwik.dev/core';
import { Link } from '@qwik.dev/router';
import { COMMENT_MAX, COMMENT_SORT_LABELS, COMMENT_SORTS, type CatalogVote, type CommentPage, type CommentSort, type SoundComment } from '../../lib/catalog';
import { formatCount } from '../../lib/sound-stats';
import { Icon } from '../dashboard/icons';
import { createComment, deleteComment, loadComments, updateComment, voteComment } from './catalog-server';
import { LoginGate } from './login-gate';
import { PersonAvatar } from './sound-items';

const THREAD_DEPTH = 3;
const RELATIVE = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];

function timeAgo(iso: string) {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  for (const [unit, size] of STEPS) {
    if ( Math.abs(seconds) >= size ) { return RELATIVE.format(Math.round(seconds / size), unit); }
  }
  return 'just now';
}

interface ThreadContext {
  soundId: string;
  base: string;
  signedIn: boolean;
  soundOwned: boolean;
  loginHref: string;
  sort: CommentSort;
  total: Signal<number>;
  onPinned$: QRL<(commentId: string, previousId: string | null) => void>;
}

interface CommentItemProps {
  comment: SoundComment;
  depth: number;
  thread: ThreadContext;
}

const CommentItem = component$<CommentItemProps>(({ comment, depth, thread }) => {
  const state = useStore({ replies: null as SoundComment[] | null, cursor: null as string | null, open: false, loading: false, replying: false, editing: false, gate: false, error: null as string | null });
  const draft = useSignal('');
  const busy = useSignal(false);

  const loadReplies = $(async (cursor: string | null) => {
    state.loading = true;
    const result = await loadComments(thread.soundId, { parentId: comment.id, sort: 'oldest', cursor });
    state.loading = false;
    if ( !result.ok ) { state.error = result.message; return; }
    state.replies = [...(cursor ? state.replies ?? [] : []), ...result.data.items];
    state.cursor = result.data.nextCursor;
  });

  const vote = $(async (next: CatalogVote) => {
    if ( !thread.signedIn ) { state.gate = true; return; }
    const value = comment.viewer?.vote === next ? null : next;
    const result = await voteComment(thread.soundId, comment.id, value);
    if ( !result.ok ) { state.error = result.message; return; }
    comment.likes = result.data.likes;
    comment.viewer = { ownedByMe: comment.viewer?.ownedByMe ?? false, vote: result.data.vote };
  });

  const reply = $(async () => {
    const text = draft.value.trim();
    if ( !text || busy.value ) { return; }
    busy.value = true;
    const result = await createComment(thread.soundId, text, comment.id);
    busy.value = false;
    if ( !result.ok ) { state.error = result.message; return; }
    thread.total.value = result.data.commentCount;
    comment.replyCount += 1;
    state.replies = [...(state.replies ?? []), result.data.comment];
    state.open = true;
    state.replying = false;
    draft.value = '';
  });

  const saveEdit = $(async () => {
    const text = draft.value.trim();
    if ( !text || busy.value ) { return; }
    busy.value = true;
    const result = await updateComment(thread.soundId, comment.id, { text });
    busy.value = false;
    if ( !result.ok ) { state.error = result.message; return; }
    comment.text = result.data.comment.text;
    comment.editedAt = result.data.comment.editedAt;
    state.editing = false;
  });

  const remove = $(async () => {
    const result = await deleteComment(thread.soundId, comment.id);
    if ( !result.ok ) { state.error = result.message; return; }
    thread.total.value = result.data.commentCount;
    comment.deleted = true;
    comment.text = null;
    comment.author = null;
  });

  const toggle = $(async (field: 'pinned' | 'hearted') => {
    const result = await updateComment(thread.soundId, comment.id, { [field]: !comment[field] });
    if ( !result.ok ) { state.error = result.message; return; }
    comment[field] = result.data.comment[field];
    field === 'pinned' && thread.onPinned$(comment.id, result.data.previousPinnedId);
  });

  const authored = comment.viewer?.ownedByMe === true && !comment.deleted;
  const canModerate = thread.soundOwned && !comment.deleted;
  const childDepth = Math.min(depth + 1, THREAD_DEPTH);
  const deep = depth >= THREAD_DEPTH;

  return (
    <li class="comment">
      {comment.author ? <PersonAvatar user={comment.author} size={depth ? 28 : 36} /> : <span class="avatar" style={{ '--avatar-size': depth ? '1.75rem' : '2.25rem', '--avatar-bg': 'var(--bb-bg-active)' }} aria-hidden="true" />}
      <div class="comment__body">
        {comment.pinned && <span class="comment__pin"><Icon name="pin" />Pinned by the uploader</span>}
        <div class="comment__top">
          {comment.author ? <Link href={`${thread.base}/u/${comment.author.id}/`} class="comment__author" prefetchData="off">{comment.author.name}</Link> : <span class="text-subtle">Deleted</span>}
          {comment.uploader && <span class="badge badge--accent">Uploader</span>}
          {authored && <span class="badge">You</span>}
          <span class="caption">{timeAgo(comment.createdAt)}{comment.editedAt ? ' · edited' : ''}</span>
        </div>
        {state.editing ? (
          <div class="comments__compose">
            <textarea class="textarea" rows={2} maxLength={COMMENT_MAX} aria-label="Edit comment" bind:value={draft} />
            <div class="catalog-gate__actions">
              <button type="button" class="button button--ghost button--sm" onClick$={() => (state.editing = false)}>Cancel</button>
              <button type="button" class="button button--primary button--sm" disabled={busy.value} onClick$={saveEdit}>Save</button>
            </div>
          </div>
        ) : (
          <p class={['comment__text', comment.deleted && 'comment__text--deleted']}>{comment.deleted ? 'This comment was deleted.' : comment.text}</p>
        )}
        {!comment.deleted && (
          <div class="comment__actions catalog-anchor">
            <button type="button" class="comment__action" aria-pressed={comment.viewer?.vote === 'LIKE'} aria-label={`Like, ${comment.likes} likes`} onClick$={() => vote('LIKE')}>
              <Icon name="thumbUp" />{formatCount(comment.likes)}
            </button>
            <button type="button" class="comment__action" aria-pressed={comment.viewer?.vote === 'DISLIKE'} aria-label="Dislike" onClick$={() => vote('DISLIKE')}>
              <Icon name="thumbDown" />
            </button>
            <button type="button" class="comment__action" onClick$={() => {
              if ( !thread.signedIn ) { state.gate = true; return; }
              state.replying = !state.replying;
              draft.value = '';
            }}>Reply</button>
            {comment.hearted && <span class="comment__pin"><Icon name="heart" />Liked by the uploader</span>}
            {canModerate && !comment.parentId && (
              <button type="button" class="comment__action" aria-pressed={comment.pinned} onClick$={() => toggle('pinned')}><Icon name="pin" />{comment.pinned ? 'Unpin' : 'Pin'}</button>
            )}
            {canModerate && (
              <button type="button" class="comment__action" aria-pressed={comment.hearted} onClick$={() => toggle('hearted')}><Icon name="heart" />{comment.hearted ? 'Remove heart' : 'Heart'}</button>
            )}
            {authored && (
              <>
                <button type="button" class="comment__action" onClick$={() => {
                  draft.value = comment.text ?? '';
                  state.editing = true;
                }}><Icon name="edit" />Edit</button>
                <button type="button" class="comment__action" onClick$={remove}><Icon name="trash" />Delete</button>
              </>
            )}
            {state.gate && <LoginGate title="Log in to like and reply" text="Join the conversation with your Discord account." loginHref={thread.loginHref} onClose$={() => (state.gate = false)} />}
          </div>
        )}
        {state.error && <p class="callout callout--danger" role="alert">{state.error}</p>}
        {state.replying && (
          <div class="comments__compose">
            <textarea class="textarea" rows={2} maxLength={COMMENT_MAX} aria-label={`Reply to ${comment.author?.name ?? 'comment'}`} placeholder="Add a reply…" bind:value={draft} />
            <div class="catalog-gate__actions">
              <button type="button" class="button button--ghost button--sm" onClick$={() => (state.replying = false)}>Cancel</button>
              <button type="button" class="button button--primary button--sm" disabled={busy.value || !draft.value.trim()} onClick$={reply}>Reply</button>
            </div>
          </div>
        )}
        {comment.replyCount > 0 && (
          <button type="button" class="comment__action comment__toggle" aria-expanded={state.open} disabled={state.loading} onClick$={async () => {
            state.open = !state.open;
            state.open && state.replies === null && (await loadReplies(null));
          }}>
            <Icon name={deep ? 'thread' : 'chevronDown'} />
            {state.open ? 'Hide replies' : deep ? `Continue this thread · ${comment.replyCount}` : `${comment.replyCount} ${comment.replyCount === 1 ? 'reply' : 'replies'}`}
          </button>
        )}
        {state.open && state.replies && (
          <ul class="comment__thread">
            {state.replies.map((child) => <CommentItem key={child.id} comment={child} depth={childDepth} thread={thread} />)}
            {state.cursor && <li><button type="button" class="comment__action comment__toggle" disabled={state.loading} onClick$={() => loadReplies(state.cursor)}>More replies</button></li>}
          </ul>
        )}
      </div>
    </li>
  );
});

interface CommentsProps {
  soundId: string;
  base: string;
  commentCount: number;
  seed: CommentPage;
  signedIn: boolean;
  soundOwned: boolean;
  loginHref: string;
}

export const Comments = component$<CommentsProps>(({ soundId, base, commentCount, seed, signedIn, soundOwned, loginHref }) => {
  const list = useStore({ items: seed.items, cursor: seed.nextCursor, sort: 'top' as CommentSort, loading: false, error: null as string | null });
  const total = useSignal(commentCount);
  const draft = useSignal('');
  const busy = useSignal(false);

  const load = $(async (sort: CommentSort, cursor: string | null) => {
    list.loading = true;
    const result = await loadComments(soundId, { sort, cursor });
    list.loading = false;
    if ( !result.ok ) { list.error = result.message; return; }
    list.items = cursor ? [...list.items, ...result.data.items] : result.data.items;
    list.cursor = result.data.nextCursor;
    list.sort = sort;
  });

  const post = $(async () => {
    const text = draft.value.trim();
    if ( !text || busy.value ) { return; }
    busy.value = true;
    const result = await createComment(soundId, text, null);
    busy.value = false;
    if ( !result.ok ) { list.error = result.message; return; }
    total.value = result.data.commentCount;
    list.items = [result.data.comment, ...list.items];
    draft.value = '';
  });

  const onPinned$ = $((commentId: string, previousId: string | null) => {
    if ( !previousId ) { return; }
    for (const item of list.items) {
      item.id === previousId && item.id !== commentId && (item.pinned = false);
    }
  });

  const thread: ThreadContext = { soundId, base, signedIn, soundOwned, loginHref, sort: list.sort, total, onPinned$ };

  return (
    <section class="comments" aria-labelledby="comments-title">
      <div class="catalog-section__head">
        <h3 id="comments-title" class="heading--sm">{formatCount(total.value)} {total.value === 1 ? 'comment' : 'comments'}</h3>
        <div class="segmented" role="group" aria-label="Sort comments">
          {COMMENT_SORTS.map((sort) => (
            <label key={sort} class="segmented__item">
              <input type="radio" name="comment-sort" class="visually-hidden" checked={list.sort === sort} disabled={list.loading} onChange$={() => load(sort, null)} />
              {COMMENT_SORT_LABELS[sort]}
            </label>
          ))}
        </div>
      </div>
      {signedIn ? (
        <div class="comments__compose">
          <label for="comment-new" class="visually-hidden">Add a comment</label>
          <textarea id="comment-new" class="textarea" rows={2} maxLength={COMMENT_MAX} placeholder="Add a comment…" bind:value={draft} />
          {draft.value.trim() && (
            <div class="catalog-gate__actions">
              <button type="button" class="button button--ghost button--sm" onClick$={() => (draft.value = '')}>Cancel</button>
              <button type="button" class="button button--primary button--sm" disabled={busy.value} onClick$={post}>Comment</button>
            </div>
          )}
        </div>
      ) : (
        <div class="comments__guest">
          <Icon name="message" />
          <span class="text-muted">Log in to comment and reply. You can still read every thread.</span>
          <a href={loginHref} class="button button--primary button--sm"><Icon name="login" />Log in with Discord</a>
        </div>
      )}
      {list.error && <p class="callout callout--danger" role="alert">{list.error}</p>}
      {list.items.length ? (
        <ul class="comments__list">
          {list.items.map((comment) => <CommentItem key={comment.id} comment={comment} depth={0} thread={thread} />)}
        </ul>
      ) : (
        <p class="text-muted">No comments yet.</p>
      )}
      {list.cursor && <button type="button" class="button button--secondary button--sm" disabled={list.loading} onClick$={() => load(list.sort, list.cursor)}>Show more comments</button>}
    </section>
  );
});
