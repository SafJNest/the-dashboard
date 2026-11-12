import { component$, Slot, useSignal, type QRL } from '@qwik.dev/core';
import { Form } from '@qwik.dev/router';
import type { SettingsProblem } from '../../lib/guild';
import { useGuild, useSaveSettings } from '../../routes/dashboard/[guildId]/layout';
import { Icon } from '../dashboard/icons';

interface SectionIntroProps {
  group: string;
  title: string;
  description: string;
  command: string;
}

export const SectionIntro = component$<SectionIntroProps>(({ group, title, description, command }) => {
  const guild = useGuild();
  return (
    <div class="settings-head__text">
      <p class="overline">{guild.value.name} · {group}</p>
      <h1 class="settings-head__title">{title}</h1>
      <p class="text-muted">{description}</p>
      <p class="caption">
        Slash command <span class="mono text-accent">{command}</span>
      </p>
    </div>
  );
});

interface SettingsFormProps extends SectionIntroProps {
  section: string;
  itemKey?: string;
  toggle?: { name: string; checked: boolean; label: string };
  problems?: SettingsProblem[];
  onReset$: QRL<() => void>;
}

export const SettingsForm = component$<SettingsFormProps>((props) => {
  const save = useSaveSettings();
  const dirty = useSignal(false);
  const result = save.value?.section === props.section && (save.value.key ?? '') === (props.itemKey ?? '') ? save.value : null;
  const problems = props.problems ?? [];

  return (
    <Form
      action={save}
      class="settings-form"
      onInput$={(event) => {
        if ((event.target as HTMLInputElement).name) dirty.value = true;
      }}
      onSubmitCompleted$={(event) => {
        if (event.detail.value?.ok) dirty.value = false;
      }}
    >
      <input type="hidden" name="section" value={props.section} />
      {props.itemKey && <input type="hidden" name="key" value={props.itemKey} />}
      <header class="settings-head">
        <SectionIntro group={props.group} title={props.title} description={props.description} command={props.command} />
        {props.toggle && (
          <label class="settings-head__toggle">
            <span class="settings-head__on" aria-hidden="true">Enabled</span>
            <span class="settings-head__off" aria-hidden="true">Disabled</span>
            <input type="checkbox" role="switch" class="switch" name={props.toggle.name} checked={props.toggle.checked} aria-label={props.toggle.label} />
          </label>
        )}
      </header>
      <Slot name="lead" />
      {result && !result.ok && (
        <div class="callout callout--danger" role="alert">
          <Icon name="warning" />
          <div>
            <p>{result.message ?? 'Some settings could not be saved:'}</p>
            {result.errors.length > 0 && (
              <ul class="callout__list">
                {result.errors.map((error) => (
                  <li key={`${error.field}:${error.code}`}>{error.message}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      {problems.length > 0 && (
        <div class="callout" role="note">
          <Icon name="warning" />
          <div>
            <p>Beebot can't use this setting yet:</p>
            <ul class="callout__list">
              {problems.map((problem) => (
                <li key={`${problem.field}:${problem.code}`}>{problem.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <Slot />
      {result?.ok && !dirty.value && (
        <p class="toast settings-status" role="status">
          <Icon name="check" />
          <span>Changes saved</span>
        </p>
      )}
      <div class="settings-dock" hidden={!dirty.value}>
        <div class="savebar" role="region" aria-label="Unsaved changes">
          <span>You have unsaved changes</span>
          <div class="savebar__actions">
            <button type="button" class="button button--ghost button--sm" onClick$={props.onReset$}>
              Reset
            </button>
            <button type="submit" class="button button--primary button--sm" disabled={save.isRunning}>
              {save.isRunning ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </Form>
  );
});
