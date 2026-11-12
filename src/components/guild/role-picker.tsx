import { $, component$, useSignal, type Signal } from '@qwik.dev/core';
import { roleColor, roleLock, type GuildRole } from '../../lib/guild';
import { Icon } from '../dashboard/icons';
import { closeCombo, closeOnPick, Combo } from './combo';

interface RolePickerProps {
  id: string;
  label: string;
  hint?: string;
  roles: GuildRole[];
  selected: Signal<string[]>;
  multiple?: boolean;
}

export const RolePicker = component$<RolePickerProps>(({ id, label, hint, roles, selected, multiple = true }) => {
  const query = useSignal('');
  const byId = new Map(roles.map((role) => [role.id, role]));
  const canManage = roles.some((role) => role.assignable);
  const search = query.value.trim().toLowerCase();
  const matches = (name: string) => name.toLowerCase().includes(search);
  const groups = [
    { label: 'Assignable', roles: roles.filter((role) => role.assignable) },
    { label: "Can't be assigned", roles: roles.filter((role) => !role.assignable) },
  ];
  const noneVisible = !multiple && matches('No role');
  const visible = roles.some((role) => matches(role.name)) || noneVisible;
  const current = selected.value[0] ? byId.get(selected.value[0]) : undefined;

  const clear = $((_: Event, button: HTMLButtonElement) => {
    button.closest('details')?.querySelectorAll<HTMLInputElement>('.choice__input:checked').forEach((input) => input.click());
  });

  return (
    <div class="field">
      <span id={`${id}-label`} class="label">{label}</span>
      <Combo id={id} labelId={`${id}-label`} query={query} searchLabel="Search roles">
        <span q:slot="value" class="combo__items">
          {!selected.value.length && <span class="combo__placeholder">{multiple ? 'Choose roles' : 'No role'}</span>}
          {multiple &&
            selected.value.map((roleId) => {
              const role = byId.get(roleId);
              const name = role?.name ?? 'Deleted role';
              return (
                <span class="chip chip--role" key={roleId} style={{ '--role-color': roleColor(role) }}>
                  <span class="role-dot" />
                  {name}
                  <button
                    type="button"
                    class="chip__remove"
                    aria-label={`Remove ${name}`}
                    onClick$={() => document.getElementById(`${id}-${roleId}`)?.click()}
                  >
                    <Icon name="close" />
                  </button>
                </span>
              );
            })}
          {!multiple && selected.value.length > 0 && (
            <span class="combo__selected" style={{ '--role-color': roleColor(current) }}>
              <span class="role-dot" />
              <span>{current?.name ?? 'Deleted role'}</span>
            </span>
          )}
        </span>
        {!multiple && (
          <label class="choice" hidden={!noneVisible} onClick$={closeOnPick}>
            <input
              type="radio"
              class="choice__input"
              name="roleId"
              value=""
              checked={!selected.value.length}
              onChange$={() => {
                selected.value = [];
              }}
            />
            <span class="choice__icon">
              <Icon name="none" />
            </span>
            <span class="choice__title">No role</span>
            <span class="choice__mark choice__mark--single">
              <Icon name="check" />
            </span>
          </label>
        )}
        {groups.flatMap((group) => {
          const count = group.roles.filter((role) => matches(role.name)).length;
          if (!group.roles.length) return [];
          return [
            <p class="combo__group" key={group.label} hidden={!count}>
              <span>{group.label}</span>
              <span>{count}</span>
            </p>,
            ...group.roles.map((role) => {
              const checked = selected.value.includes(role.id);
              const lock = roleLock(role, canManage);
              return (
                <label
                  class="choice choice--role"
                  key={role.id}
                  hidden={!matches(role.name)}
                  style={{ '--role-color': roleColor(role) }}
                  onClick$={multiple ? undefined : closeOnPick}
                >
                  <input
                    type={multiple ? 'checkbox' : 'radio'}
                    class="choice__input"
                    id={`${id}-${role.id}`}
                    name={multiple ? 'roleIds[]' : 'roleId'}
                    value={role.id}
                    checked={checked}
                    disabled={!!lock && !checked}
                    onChange$={(_, input) => {
                      if (!multiple) selected.value = [role.id];
                      else selected.value = input.checked ? [...selected.value, role.id] : selected.value.filter((item) => item !== role.id);
                    }}
                  />
                  <span class="choice__icon">
                    <span class="role-dot" />
                  </span>
                  <span class="choice__title">{role.name}</span>
                  {lock && (
                    <span class="choice__tag">
                      <Icon name="lock" />
                      {lock}
                    </span>
                  )}
                  <span class={['choice__mark', !multiple && 'choice__mark--single']}>
                    <Icon name="check" />
                  </span>
                </label>
              );
            }),
          ];
        })}
        {!visible && <p class="combo__empty">No roles match “{query.value.trim()}”</p>}
        {multiple && (
          <div q:slot="footer" class="combo__footer">
            <span class="caption">{selected.value.length} selected</span>
            <div class="combo__actions">
              <button type="button" class="button button--ghost button--sm" disabled={!selected.value.length} onClick$={clear}>
                Clear
              </button>
              <button type="button" class="button button--primary button--sm" onClick$={(_, button) => closeCombo(button)}>
                Done
              </button>
            </div>
          </div>
        )}
      </Combo>
      <p class="hint">{canManage ? hint : "Beebot can't assign any role. Check its Manage Roles permission and role position."}</p>
    </div>
  );
});
