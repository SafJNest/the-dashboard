import { component$, useSignal } from '@qwik.dev/core';
import type { ChannelGroup } from '../../lib/guild';
import { Icon } from '../dashboard/icons';
import { closeOnPick, Combo } from './combo';

interface ChannelPickerProps {
  id: string;
  label: string;
  hint?: string;
  groups: ChannelGroup[];
  value: string | null;
}

export const ChannelPicker = component$<ChannelPickerProps>(({ id, label, hint, groups, value }) => {
  const query = useSignal('');
  const selected = useSignal(value ?? '');
  const names = new Map(groups.flatMap((group) => group.channels.map((channel) => [channel.id, channel.name])));
  const missing = !!value && !names.has(value);
  const search = query.value.trim().toLowerCase();
  const matches = (name: string) => name.toLowerCase().includes(search);
  const visible = !search || [...names.values()].some(matches);

  return (
    <div class="field">
      <span id={`${id}-label`} class="label">{label}</span>
      <Combo id={id} labelId={`${id}-label`} query={query} searchLabel="Search channels">
        <span q:slot="value" class="combo__items">
          {selected.value ? (
            <span class="combo__selected">
              <Icon name={names.has(selected.value) ? 'hash' : 'warning'} />
              <span>{names.get(selected.value) ?? 'Missing channel'}</span>
            </span>
          ) : (
            <span class="combo__placeholder">No channel</span>
          )}
        </span>
        <label class="choice" hidden={!!search} onClick$={closeOnPick}>
          <input
            type="radio"
            class="choice__input"
            name="channelId"
            value=""
            checked={!selected.value}
            onChange$={() => {
              selected.value = '';
            }}
          />
          <span class="choice__icon">
            <Icon name="none" />
          </span>
          <span class="choice__title">No channel</span>
          <span class="choice__mark choice__mark--single">
            <Icon name="check" />
          </span>
        </label>
        {missing && (
          <label class="choice" hidden={!!search} onClick$={closeOnPick}>
            <input
              type="radio"
              class="choice__input"
              name="channelId"
              value={value!}
              checked={selected.value === value}
              onChange$={() => {
                selected.value = value!;
              }}
            />
            <span class="choice__icon">
              <Icon name="warning" />
            </span>
            <span class="choice__title">Missing channel</span>
            <span class="choice__mark choice__mark--single">
              <Icon name="check" />
            </span>
          </label>
        )}
        {groups.flatMap((group) => {
          const count = group.channels.filter((channel) => matches(channel.name)).length;
          return [
            group.name && (
              <p class="combo__group" key={`category-${group.id}`} hidden={!count}>
                <span>{group.name}</span>
                <span>{count}</span>
              </p>
            ),
            ...group.channels.map((channel) => (
              <label class="choice" key={channel.id} hidden={!matches(channel.name)} onClick$={closeOnPick}>
                <input
                  type="radio"
                  class="choice__input"
                  name="channelId"
                  value={channel.id}
                  checked={selected.value === channel.id}
                  onChange$={() => {
                    selected.value = channel.id;
                  }}
                />
                <span class="choice__icon">
                  <Icon name="hash" />
                </span>
                <span class="choice__title">{channel.name}</span>
                <span class="choice__mark choice__mark--single">
                  <Icon name="check" />
                </span>
              </label>
            )),
          ];
        })}
        {!visible && <p class="combo__empty">No channels match “{query.value.trim()}”</p>}
      </Combo>
      {hint && <p class="hint">{hint}</p>}
    </div>
  );
});
