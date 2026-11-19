import { $, component$, createContextId, noSerialize, Slot, useContextProvider, useSignal, useStore, type NoSerialize, type QRL, type Signal } from '@qwik.dev/core';

export interface PlayerState {
  soundId: string | null;
  playing: boolean;
  loading: boolean;
  ended: boolean;
  failed: string | null;
}

export interface SoundPlayerApi {
  state: PlayerState;
  audio: Signal<HTMLAudioElement | undefined>;
  download$: QRL<(url: string) => Promise<Blob | null>>;
  toggle$: QRL<(soundId: string, url: string | null) => Promise<void>>;
  seek$: QRL<(soundId: string, url: string, time: number) => Promise<void>>;
}

export const SoundPlayerContext = createContextId<SoundPlayerApi>('beebot.sound-player');

export const SoundPlayer = component$(() => {
  const audio = useSignal<HTMLAudioElement>();
  const files = useSignal<NoSerialize<Map<string, Promise<Blob | null>>>>();
  const objectUrl = useSignal<string | null>(null);
  const attempt = useSignal(0);
  const state = useStore<PlayerState>({ soundId: null, playing: false, loading: false, ended: false, failed: null });

  const download$ = $((url: string) => {
    const cache = files.value ?? new Map<string, Promise<Blob | null>>();
    files.value = noSerialize(cache);
    const cached = cache.get(url);
    if ( cached ) { return cached; }
    const fetchBlob = async () => {
      const response = await fetch(url, { cache: 'reload' });
      if ( !response.ok ) { throw new Error(`HTTP ${response.status}`); }
      return response.blob();
    };
    const request = fetchBlob().catch((error: unknown) => {
      console.error('[SoundPlayer] Download failed, streaming from the URL.', error);
      return null;
    });
    cache.set(url, request);
    return request;
  });

  const play = $(async (element: HTMLAudioElement, soundId: string) => {
    await element.play().catch((error: unknown) => {
      if ( state.soundId !== soundId ) { return; }
      console.error('[SoundPlayer] Playback failed.', error);
      state.loading = false;
      state.playing = false;
      state.failed = soundId;
    });
  });

  const open = $(async (soundId: string, url: string, time: number) => {
    const element = audio.value;
    if ( !element ) { return; }
    const ticket = ++attempt.value;
    element.pause();
    state.soundId = soundId;
    state.loading = true;
    state.ended = false;
    state.failed = null;
    const blob = await download$(url);
    if ( ticket !== attempt.value ) { return; }
    objectUrl.value && URL.revokeObjectURL(objectUrl.value);
    objectUrl.value = blob ? URL.createObjectURL(blob) : null;
    element.src = objectUrl.value ?? url;
    time > 0 && element.addEventListener('loadedmetadata', () => (element.currentTime = time), { once: true });
    await play(element, soundId);
  });

  const toggle$ = $(async (soundId: string, url: string | null) => {
    const element = audio.value;
    if ( !element || !url ) { return; }
    const reopen = state.soundId !== soundId || state.failed === soundId;
    if ( reopen ) { await open(soundId, url, 0); return; }
    if (!element.paused) {
      element.pause();
      return;
    }
    if (state.loading) {
      attempt.value++;
      state.soundId = null;
      state.loading = false;
      return;
    }
    await play(element, soundId);
  });

  const seek$ = $(async (soundId: string, url: string, time: number) => {
    const element = audio.value;
    if ( !element ) { return; }
    if ( state.soundId !== soundId ) { await open(soundId, url, time); return; }
    if ( state.loading ) { return; }
    element.currentTime = time;
    element.paused && (await play(element, soundId));
  });

  useContextProvider(SoundPlayerContext, { state, audio, download$, toggle$, seek$ });

  return (
    <>
      <Slot />
      <audio
        ref={audio}
        preload="none"
        onPlaying$={() => {
          state.playing = true;
          state.loading = false;
          state.ended = false;
          state.failed = null;
        }}
        onPause$={() => (state.playing = false)}
        onWaiting$={() => (state.loading = state.soundId !== null)}
        onEnded$={() => {
          state.playing = false;
          state.ended = true;
        }}
        onError$={() => {
          if ( !state.soundId ) { return; }
          state.failed = state.soundId;
          state.playing = false;
          state.loading = false;
        }}
      />
    </>
  );
});
