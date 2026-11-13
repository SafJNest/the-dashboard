import { DEFAULT_PREFIX, type CommandEntry, type CommandLine } from '../../lib/commands';
import { Icon } from '../dashboard/icons';

const SIGILS = { slash: '/', prefix: DEFAULT_PREFIX } as const;
const KIND_LABELS = { slash: 'Slash command', prefix: 'Prefix command' } as const;

const Cooldown = ({ seconds }: { seconds: number }) => (
  <span class="command-cooldown" title="Cooldown">
    <Icon name="clock" />
    {seconds}s
  </span>
);

const Line = ({ line }: { line: CommandLine }) => (
  <code class={`command-line command-line--${line.kind}`}>
    <span class="visually-hidden">{KIND_LABELS[line.kind]} </span>
    <span>
      <span class="command-sigil">{SIGILS[line.kind]}</span>
      {line.parent && <span class="command-parent">{line.parent}</span>}
      {line.name}
    </span>
    {line.args.map((arg, index) => (
      <span
        key={`${arg.label}-${index}`}
        class={['command-arg', arg.required ? 'command-arg--required' : 'command-arg--optional']}
        title={arg.description || undefined}
      >
        {arg.required ? `<${arg.label}>` : `[${arg.label}]`}
      </span>
    ))}
  </code>
);

const Details = ({ text }: { text: string }) => (
  <details class="command-details">
    <summary>More details</summary>
    <p>{text}</p>
  </details>
);

export const CommandEntryCard = ({ entry }: { entry: CommandEntry }) => {
  const titleId = `command-${entry.name}`;

  return (
    <article class="command-entry" data-search={entry.search} aria-labelledby={titleId}>
      <div class="command-entry__info">
        <h3 class="command-entry__name" id={titleId}>
          {entry.name}
        </h3>
        <p class="command-entry__help">{entry.help}</p>
        <div class="command-tags">
          {entry.slash && <span class="badge badge--accent">Slash</span>}
          {entry.prefix && <span class="badge badge--info">Prefix</span>}
          {entry.cooldown && <Cooldown seconds={entry.cooldown} />}
        </div>
        {entry.details && <Details text={entry.details} />}
      </div>
      <ul class="command-usages">
        {entry.usages.map((usage) => (
          <li key={usage.key} class="command-usage" data-search={usage.search}>
            <div class="command-lines">
              {usage.lines.map((line) => (
                <Line key={line.kind} line={line} />
              ))}
            </div>
            {usage.help && <p class="command-usage__help">{usage.help}</p>}
            {(usage.aliases.length > 0 || usage.cooldown) && (
              <div class="command-tags">
                {usage.aliases.length > 0 && (
                  <p class="command-aliases">
                    <span class="command-aliases__label">Aliases</span>
                    {usage.aliases.map((alias) => (
                      <span key={alias}>
                        {DEFAULT_PREFIX}
                        {alias}
                      </span>
                    ))}
                  </p>
                )}
                {usage.cooldown && <Cooldown seconds={usage.cooldown} />}
              </div>
            )}
            {usage.details && <Details text={usage.details} />}
          </li>
        ))}
      </ul>
    </article>
  );
};
