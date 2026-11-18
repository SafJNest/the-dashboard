import { component$ } from '@qwik.dev/core';
import { Form } from '@qwik.dev/router';
import { useCreateKeyedAlert } from '../../routes/dashboard/[guildId]/layout';

export const KeyedAlertCreate = component$<{ kind: 'reward' | 'twitch' }>(({ kind }) => {
  const create = useCreateKeyedAlert();
  const reward = kind === 'reward';

  return (
    <Form action={create} class="card settings-card">
      <input type="hidden" name="kind" value={kind} />
      <div class="field">
        <label class="label" for={`create-${kind}`}>{reward ? 'Reward level' : 'Twitch username'}</label>
        <input id={`create-${kind}`} class="input" type={reward ? 'number' : 'text'} name="identifier"
          min={reward ? 1 : undefined} max={reward ? 100 : undefined} maxLength={reward ? undefined : 25} required />
      </div>
      <button type="submit" class="button button--secondary" disabled={create.isRunning}>
        {reward ? 'Add reward' : 'Link streamer'}
      </button>
      {create.value?.message && <p role="alert">{create.value.message}</p>}
    </Form>
  );
});
