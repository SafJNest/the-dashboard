import { LOAD_ERROR, type GuildLibraryLoad, type GuildStatsLoad, type LibraryLoad, type MyLibraryLoad, type MyStatsLoad } from '../../lib/sound-library';
import { readPeriod } from '../../lib/sounds';

interface LoadSignal<T> {
  readonly value: T;
  readonly pending: boolean;
  readonly error: Error | undefined;
  invalidate(): void;
}

export type LibrarySource =
  | { scope: 'guild'; guildId: string; guildName: string; library: LoadSignal<GuildLibraryLoad>; analytics: LoadSignal<GuildStatsLoad> }
  | { scope: 'me'; library: LoadSignal<MyLibraryLoad>; analytics: LoadSignal<MyStatsLoad> };

function read<T>(signal: LoadSignal<T>, url: URL, guildId: string | null): T {
  if (!signal.error) return signal.value;
  return { failed: true, status: 503, message: LOAD_ERROR, retryAfter: null, period: readPeriod(url.searchParams.get('period')), guildId } as T;
}

export function readSource(source: LibrarySource, url: URL, withStats: boolean): LibraryLoad {
  if (source.scope === 'guild') {
    const { guildId } = source;
    return { scope: 'guild', guildId, guildName: source.guildName, library: read(source.library, url, guildId), analytics: withStats ? read(source.analytics, url, guildId) : undefined };
  }
  return { scope: 'me', library: read(source.library, url, null), analytics: withStats ? read(source.analytics, url, null) : undefined };
}
