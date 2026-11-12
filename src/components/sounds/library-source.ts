import { LOAD_ERROR, type GuildLibraryLoad, type GuildStatsLoad, type LibraryLoad, type MyLibraryLoad, type MyStatsLoad } from '../../lib/sound-library';
import { DEFAULT_PERIOD, type Period } from '../../lib/sounds';

interface LoadSignal<T> {
  readonly value: T;
  readonly pending: boolean;
  readonly error: Error | undefined;
  invalidate(): void;
}

export type LibrarySource =
  | { scope: 'guild'; guildId: string; guildName: string; library: LoadSignal<GuildLibraryLoad>; analytics: LoadSignal<GuildStatsLoad> }
  | { scope: 'me'; library: LoadSignal<MyLibraryLoad>; analytics: LoadSignal<MyStatsLoad> };

function read<T>(signal: LoadSignal<T>, period: Period | null, guildId: string | null): T {
  if (!signal.error) return signal.value;
  return { failed: true, status: 503, message: LOAD_ERROR, retryAfter: null, period: period ?? DEFAULT_PERIOD, guildId } as T;
}

export function readSource(source: LibrarySource, period: Period | null, withStats: boolean): LibraryLoad {
  if (source.scope === 'guild') {
    const { guildId } = source;
    return { scope: 'guild', guildId, guildName: source.guildName, library: read(source.library, period, guildId), analytics: withStats ? read(source.analytics, period, guildId) : undefined };
  }
  return { scope: 'me', library: read(source.library, period, null), analytics: withStats ? read(source.analytics, period, null) : undefined };
}
