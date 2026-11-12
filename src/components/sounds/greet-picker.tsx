import { $, component$, useOnDocument, useSignal } from '@qwik.dev/core';
import { useAccount, useSaveGreet } from '../../routes/dashboard/layout';
import { GLOBAL_GREET } from '../../lib/sounds';
import { GuildAvatar } from '../dashboard/guild-avatar';
import { Icon } from '../dashboard/icons';

interface GreetPickerProps {
  soundId: string;
  soundName: string;
  variant: 'button' | 'field';
}

export const GreetPicker = component$<GreetPickerProps>(({ soundId, soundName, variant }) => {
  const account = useAccount();
  const save = useSaveGreet();
  const menu = useSignal<HTMLDetailsElement>();
  const { greets, guilds } = account.value;
  const global = greets[GLOBAL_GREET];
  const usedIn = guilds.filter((guild) => greets[guild.id]?.id === soundId).map((guild) => guild.name);
  const places = [...(global?.id === soundId ? ['Global'] : []), ...usedIn];
  const failure = save.value && !save.value.ok && save.value.target === soundId ? save.value : null;
  const label = variant === 'field' ? places.join(' · ') || 'Not used as greet' : places.length ? `Greet · ${places.length === 1 ? places[0] : `${places.length} places`}` : 'Set as greet';

  useOnDocument('click', $((event) => {
    if (menu.value?.open && !menu.value.contains(event.target as Node)) menu.value.open = false;
  }));
  useOnDocument('keydown', $((event) => {
    if ((event as KeyboardEvent).key !== 'Escape' || !menu.value?.open) return;
    menu.value.open = false;
    menu.value.querySelector('summary')?.focus();
  }));

  const change = $(async (key: string, input: HTMLInputElement) => {
    const { value } = await save.submit({ key, target: soundId, soundId: input.checked ? soundId : '' });
    if (!value.ok) input.checked = !input.checked;
  });

  const current = (key: string) => {
    const greet = greets[key];
    if (greet?.id === soundId) return `Using ${soundName}`;
    return greet ? `Now ${greet.name}` : 'No greet set';
  };

  return (
    <details class={['greet', `greet--${variant}`]} ref={menu}>
      <summary class={['greet__toggle', variant === 'field' ? 'select' : 'button button--secondary', places.length > 0 && 'greet__toggle--on']} aria-label={`Greet for ${soundName}: ${places.join(', ') || 'not used'}`}>
        <Icon name="greet" />
        <span class="greet__label">{label}</span>
        {variant === 'button' && <Icon name="chevronDown" />}
      </summary>
      <div class="greet__pop" aria-busy={save.isRunning}>
        <label class="greet__global">
          <span class="greet__text">
            <span class="option__title">Global greet</span>
            <span class="caption">{current(GLOBAL_GREET)} · used where no server greet is set</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            class="switch"
            checked={global?.id === soundId}
            disabled={save.isRunning}
            onChange$={(_, input) => change(GLOBAL_GREET, input)}
          />
        </label>
        <p class="combo__group">
          <span>Servers</span>
          <span>{usedIn.length}</span>
        </p>
        <div class="greet__list" role="group" aria-label="Use as greet in these servers">
          {guilds.map((guild) => (
            <label class="choice" key={guild.id}>
              <input
                type="checkbox"
                class="choice__input"
                checked={greets[guild.id]?.id === soundId}
                disabled={save.isRunning}
                onChange$={(_, input) => change(guild.id, input)}
              />
              <GuildAvatar name={guild.name} iconUrl={guild.iconUrl} size="sm" />
              <span class="greet__text">
                <span class="choice__title">{guild.name}</span>
                <span class="caption">{current(guild.id)}</span>
              </span>
              <span class="choice__mark">
                <Icon name="check" />
              </span>
            </label>
          ))}
        </div>
        {failure && (
          <p class="greet__error" role="alert">
            {failure.errors[0]?.message ?? failure.message}
          </p>
        )}
      </div>
    </details>
  );
});
