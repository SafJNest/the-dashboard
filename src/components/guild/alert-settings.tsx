import { $, component$, Slot, useSignal, type QRL, type Signal } from '@qwik.dev/core';
import { channelGroups, emptyAlert, guildRoles, SEND_TYPES, type Guild, type GuildAlert } from '../../lib/guild';
import { useGuild } from '../../routes/dashboard/[guildId]/layout';
import { Icon } from '../dashboard/icons';
import { ChannelPicker } from './channel-picker';
import { RolePicker } from './role-picker';
import { SettingsForm } from './settings-form';

export type AlertKind = 'welcome' | 'leave' | 'boost' | 'levelUp' | 'reward' | 'twitch';

interface AlertMeta {
  group: string;
  title: string;
  description: string;
  command: string;
  toggle: string;
  variables: string[];
  channel: boolean;
  roles?: { mode: 'multi' | 'single'; label: string; hint: string };
  temporary?: boolean;
}

const ALERTS: Record<AlertKind, AlertMeta> = {
  welcome: {
    group: 'Messages',
    title: 'Welcome message',
    description: 'Sent when a member joins. Choose where it goes, write it and pick roles to give on join.',
    command: '/welcome',
    toggle: 'Enable welcome message',
    variables: ['#user', '#role'],
    channel: true,
    roles: { mode: 'multi', label: 'Roles on join', hint: "Only roles below Beebot's highest role can be assigned." },
  },
  leave: {
    group: 'Messages',
    title: 'Leave message',
    description: 'Sent when a member leaves the server.',
    command: '/leave',
    toggle: 'Enable leave message',
    variables: ['#user'],
    channel: true,
  },
  boost: {
    group: 'Messages',
    title: 'Boost message',
    description: 'Thank members who boost the server, in a channel, in their DMs or both.',
    command: '/boost',
    toggle: 'Enable boost message',
    variables: ['#user', '#role'],
    channel: true,
    roles: { mode: 'multi', label: 'Roles on boost', hint: "Only roles below Beebot's highest role can be assigned." },
  },
  levelUp: {
    group: 'Leveling',
    title: 'Level-up message',
    description: 'Sent every time a member reaches a new level, in the channel where they leveled up.',
    command: '/levelup',
    toggle: 'Enable level-up message',
    variables: ['#user', '#level'],
    channel: false,
  },
  reward: {
    group: 'Leveling',
    title: 'Rewards',
    description: 'Give roles when members reach a level, each with its own message.',
    command: '/reward',
    toggle: 'Enable this reward',
    variables: ['#user', '#level', '#role'],
    channel: false,
    roles: { mode: 'multi', label: 'Roles given', hint: "Beebot can only give roles below its own highest role." },
    temporary: true,
  },
  twitch: {
    group: 'Integrations',
    title: 'Twitch alerts',
    description: 'Announce when linked streamers go live.',
    command: '/twitch link · /twitch menu',
    toggle: 'Enable alerts for this streamer',
    variables: ['#streamer'],
    channel: true,
    roles: { mode: 'single', label: 'Role to ping', hint: 'Members with this role are pinged when the stream starts.' },
  },
};

const SEND_LABELS = { CHANNEL: 'Channel', PRIVATE: 'Private (DM)', BOTH: 'Both' };
const MESSAGE_LIMIT = 2000;

function findAlert(guild: Guild, kind: AlertKind, itemKey?: string) {
  const { settings } = guild;
  if (kind === 'reward') return itemKey ? settings.reward[itemKey] : undefined;
  if (kind === 'twitch') return itemKey ? settings.twitch[itemKey] : undefined;
  return settings[kind];
}

interface AlertSettingsProps {
  kind: AlertKind;
  itemKey?: string;
}

export const AlertSettings = component$<AlertSettingsProps>(({ kind, itemKey }) => {
  const guild = useGuild();
  const version = useSignal(0);
  const current = findAlert(guild.value, kind, itemKey);
  const alert = current?.exists ? current : emptyAlert();

  return (
    <AlertForm
      key={`${guild.value.id}:${itemKey ?? ''}:${version.value}`}
      kind={kind}
      itemKey={itemKey}
      alert={alert}
      onReset$={$(() => {
        version.value++;
      })}
    >
      <Slot name="lead" q:slot="lead" />
    </AlertForm>
  );
});

interface AlertFormProps {
  kind: AlertKind;
  itemKey?: string;
  alert: GuildAlert;
  onReset$: QRL<() => void>;
}

const AlertForm = component$<AlertFormProps>(({ kind, itemKey, alert, onReset$ }) => {
  const guild = useGuild();
  const meta = ALERTS[kind];
  const message = useSignal(alert.message ?? '');
  const privateMessage = useSignal(alert.privateMessage ?? '');
  const roleIds = useSignal(alert.roleIds ?? []);
  const roleId = useSignal(alert.roleId ? [alert.roleId] : []);
  const messageInput = useSignal<HTMLTextAreaElement>();
  const privateInput = useSignal<HTMLTextAreaElement>();
  const roles = guildRoles(guild.value);
  const id = `alert-${kind}`;

  const insert = $((target: Signal<HTMLTextAreaElement | undefined>, token: string) => {
    const input = target.value;
    if (!input) return;
    input.focus();
    input.setRangeText(token, input.selectionStart, input.selectionEnd, 'end');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  const roleNames = (kind === 'twitch' ? roleId.value : roleIds.value)
    .map((value) => roles.find((role) => role.id === value)?.name)
    .filter(Boolean);
  const samples: Record<string, { text: string; mention?: boolean }> = {
    '#user': { text: '@Luna', mention: true },
    '#level': { text: alert.level ? String(alert.level) : '24' },
    '#role': { text: roleNames.length ? roleNames.map((name) => `@${name}`).join(', ') : '@role', mention: true },
    '#streamer': { text: 'Streamer' },
  };
  const pattern = new RegExp(`(${meta.variables.join('|')})`);
  const segments = (value: string) => value.split(pattern).filter(Boolean).map((part) => samples[part] ?? { text: part });

  return (
    <SettingsForm
      section={kind}
      itemKey={itemKey}
      group={meta.group}
      title={meta.title}
      description={meta.description}
      command={meta.command}
      toggle={{ name: 'enabled', checked: alert.enabled, label: meta.toggle }}
      problems={alert.problems}
      onReset$={onReset$}
    >
      <Slot name="lead" q:slot="lead" />
      <div class="settings-grid alert-form">
        <section class="card settings-card" aria-label="Message settings">
          {meta.temporary && (
            <label class="field-check">
              <input type="checkbox" class="switch switch--sm" role="switch" name="temporary" checked={!!alert.temporary} />
              <span>Remove when a higher reward is reached</span>
            </label>
          )}
          {meta.roles?.mode === 'multi' && (
            <RolePicker id={id} label={meta.roles.label} hint={meta.roles.hint} roles={roles} selected={roleIds} />
          )}
          {meta.roles?.mode === 'single' && (
            <RolePicker id={`${id}-role`} label={meta.roles.label} hint={meta.roles.hint} roles={roles} selected={roleId} multiple={false} />
          )}
          {meta.channel && (
            <ChannelPicker id={`${id}-channel`} label="Channel" groups={channelGroups(guild.value)} value={alert.channelId} />
          )}
          <fieldset class="fieldset">
            <legend class="label">Send to</legend>
            <div class="segmented">
              {SEND_TYPES.map((type) => (
                <label class="segmented__item" key={type}>
                  <input type="radio" class="segmented__input" name="sendType" value={type} checked={alert.sendType === type} />
                  {SEND_LABELS[type]}
                </label>
              ))}
            </div>
          </fieldset>
          <MessageField
            id={`${id}-message`}
            name="message"
            label={kind === 'twitch' ? 'Live message' : 'Message'}
            value={message}
            input={messageInput}
            variables={meta.variables}
            onInsert$={insert}
          />
          <div class="alert-form__private">
            <MessageField
              id={`${id}-private`}
              name="privateMessage"
              label="Private message"
              note="Optional"
              placeholder="Leave empty to reuse the channel message"
              value={privateMessage}
              input={privateInput}
              variables={meta.variables}
              onInsert$={insert}
            />
          </div>
        </section>
        <aside class="card card--raised preview" aria-label="Preview">
          <p class="overline">Live preview</p>
          <div class="discord preview__channel">
            <DiscordMessage segments={segments(message.value)} />
          </div>
          <div class="discord preview__dm">
            <p class="discord__dm">
              <Icon name="message" />
              <span>Direct message to Luna</span>
            </p>
            <DiscordMessage segments={segments(privateMessage.value || message.value)} />
          </div>
          <p class="caption">
            <span class="preview__note--channel">Shown with sample member Luna.</span>
            <span class="preview__note--private">Sent only as a DM.</span>
            <span class="preview__note--both">Sent in the channel and as a DM.</span>
          </p>
        </aside>
      </div>
    </SettingsForm>
  );
});

interface MessageFieldProps {
  id: string;
  name: string;
  label: string;
  note?: string;
  placeholder?: string;
  value: Signal<string>;
  input: Signal<HTMLTextAreaElement | undefined>;
  variables: string[];
  onInsert$: QRL<(target: Signal<HTMLTextAreaElement | undefined>, token: string) => void>;
}

const MessageField = component$<MessageFieldProps>(({ id, name, label, note, placeholder, value, input, variables, onInsert$ }) => (
  <div class="field">
    <div class="field-row">
      <label class="label" for={id}>{label}</label>
      <span class="caption">{note ?? 'Click a variable to insert it'}</span>
    </div>
    <div class="textarea-wrap">
      <textarea
        id={id}
        name={name}
        ref={input}
        class="textarea"
        rows={name === 'message' ? 4 : 3}
        maxLength={MESSAGE_LIMIT}
        placeholder={placeholder}
        bind:value={value}
      />
      <div class="textarea-toolbar">
        {variables.map((variable) => (
          <button type="button" class="variable" key={variable} onClick$={() => onInsert$(input, variable)}>
            {variable}
          </button>
        ))}
        <span class="counter">{value.value.length} / {MESSAGE_LIMIT}</span>
      </div>
    </div>
  </div>
));

interface DiscordMessageProps {
  segments: { text: string; mention?: boolean }[];
}

function DiscordMessage({ segments }: DiscordMessageProps) {
  return (
    <div class="discord__message">
      <span class="avatar" aria-hidden="true">B</span>
      <div class="discord__body">
        <div class="discord__meta">
          <span class="discord__name">Beebot</span>
          <span class="badge badge--app">APP</span>
          <span class="discord__time">Today at 21:04</span>
        </div>
        {segments.length ? (
          <p class="discord__text">
            {segments.map((segment, index) => (
              <span key={index} class={segment.mention ? 'discord__mention' : undefined}>{segment.text}</span>
            ))}
          </p>
        ) : (
          <p class="discord__text discord__placeholder">Write a message to see the preview.</p>
        )}
      </div>
    </div>
  );
}
