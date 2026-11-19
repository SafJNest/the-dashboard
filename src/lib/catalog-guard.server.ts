import type { RequestEvent, RequestEventLoader } from '@qwik.dev/router';
import { apiError } from './beebot.server';
import { useSoundCard, useSoundComments } from './catalog-loaders';

export async function requireSound(event: RequestEvent, resolveValue: RequestEventLoader['resolveValue']) {
  const { soundId } = event.params;
  if ( !soundId ) { return; }
  resolveValue(useSoundComments).catch(() => undefined);
  const value = await resolveValue(useSoundCard);
  if ( value.failed ) { throw apiError(event, value); }
}
