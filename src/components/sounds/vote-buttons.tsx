import { $, component$ } from '@qwik.dev/core';
import { useVoteSound } from '../../routes/dashboard/layout';
import { formatCount } from '../../lib/sound-stats';
import type { Sound, Vote, VoteState } from '../../lib/sounds';
import { Icon } from '../dashboard/icons';

interface VoteButtonsProps {
  sound: Sound;
  votes: Record<string, VoteState>;
}

export const VoteButtons = component$<VoteButtonsProps>(({ sound, votes }) => {
  const action = useVoteSound();
  const state = votes[sound.id] ?? { soundId: sound.id, likes: sound.likes, dislikes: sound.dislikes, likedByMe: sound.likedByMe, dislikedByMe: sound.dislikedByMe };
  const failure = action.value?.soundId === sound.id ? action.value.message : null;

  const send = $(async (vote: Vote) => {
    const current = votes[sound.id] ?? state;
    const enabled = vote === 'like' ? !current.likedByMe : !current.dislikedByMe;
    const { value } = await action.submit({ soundId: sound.id, vote, enabled: String(enabled) });
    if (value.state) votes[sound.id] = value.state;
  });

  return (
    <div class="vote">
      <div class="vote__group" role="group" aria-label={`Rate ${sound.name}`}>
        <button type="button" class="vote__button" aria-pressed={state.likedByMe} disabled={action.isRunning} onClick$={() => send('like')}>
          <Icon name="heart" />
          <span>{formatCount(state.likes)}</span>
          <span class="visually-hidden">likes</span>
        </button>
        <button type="button" class="vote__button vote__button--dislike" aria-pressed={state.dislikedByMe} disabled={action.isRunning} onClick$={() => send('dislike')}>
          <Icon name="dislike" />
          <span>{formatCount(state.dislikes)}</span>
          <span class="visually-hidden">dislikes</span>
        </button>
      </div>
      {failure && <p class="vote__error" role="alert">{failure}</p>}
    </div>
  );
});
