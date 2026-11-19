import { component$, noSerialize, useContext, useSignal, useStyles$, useTask$, useVisibleTask$, type NoSerialize } from '@qwik.dev/core';
import type WaveSurfer from 'wavesurfer.js';
import { Skeleton } from '../skeleton/skeleton';
import { SoundPlayerContext } from './sound-player';
import styles from './sound-wave.css?inline';

const BAR_WIDTH = 2;
const BAR_GAP = 1;
const BAR_RADIUS = 2;
const CURSOR_WIDTH = 2;

type WaveState = 'loading' | 'ready' | 'failed';

interface Waveform {
  wave: WaveSurfer;
  ownMedia: HTMLAudioElement;
}

export const SoundWave = component$<{ soundId: string; url: string | null }>(({ soundId, url }) => {
  useStyles$(styles);
  const player = useContext(SoundPlayerContext);
  const surface = useSignal<HTMLDivElement>();
  const state = useSignal<WaveState>(url ? 'loading' : 'failed');
  const waveform = useSignal<NoSerialize<Waveform>>();

  useVisibleTask$(async ({ cleanup }) => {
    const container = surface.value;
    if ( !url || !container ) { return; }
    let disposed = false;
    cleanup(() => {
      disposed = true;
      const instance = waveform.value;
      instance?.wave.setMediaElement(instance.ownMedia);
      instance?.wave.destroy();
    });
    const fail = (error: unknown) => {
      if ( disposed ) { return; }
      console.error('[SoundWave] Waveform unavailable.', error);
      state.value = 'failed';
    };
    const [blob, module] = await Promise.all([player.download$(url), import('wavesurfer.js').catch(fail)]);
    if ( disposed || !module ) { return; }
    if ( !blob ) { fail(new Error(`Could not download ${url}`)); return; }
    const tokens = getComputedStyle(container);
    const progress = tokens.getPropertyValue('--wave-progress').trim();
    const ownMedia = document.createElement('audio');
    const wave = module.default.create({
      container,
      media: ownMedia,
      height: 'auto',
      waveColor: tokens.getPropertyValue('--wave-base').trim(),
      progressColor: progress,
      cursorColor: progress,
      cursorWidth: CURSOR_WIDTH,
      barWidth: BAR_WIDTH,
      barGap: BAR_GAP,
      barRadius: BAR_RADIUS,
      normalize: true,
      dragToSeek: true,
    });
    waveform.value = noSerialize({ wave, ownMedia });
    wave.on('interaction', (time) => player.seek$(soundId, url, time));
    wave.on('ready', () => (state.value = 'ready'));
    await wave.loadBlob(blob).catch(fail);
  }, { strategy: 'document-ready' });

  useTask$(({ track }) => {
    const instance = track(() => waveform.value);
    const ready = track(() => state.value === 'ready');
    const current = track(() => player.state.soundId === soundId);
    const audio = player.audio.value;
    if ( !instance || !ready || !audio ) { return; }
    const media = current ? audio : instance.ownMedia;
    if ( instance.wave.getMediaElement() === media ) { return; }
    instance.wave.setMediaElement(media);
    !current && media.dispatchEvent(new Event('pause'));
  });

  return (
    <div class={['sound-wave', `sound-wave--${state.value}`]} aria-hidden="true">
      {state.value === 'loading' && <span class="sound-wave__loader"><Skeleton width="100%" height="100%" /></span>}
      <div ref={surface} class="sound-wave__surface" />
    </div>
  );
});
