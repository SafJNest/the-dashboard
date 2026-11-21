import { $, component$, noSerialize, useOnDocument, useOnWindow, useSignal, useStore, useStyles$, type NoSerialize, type QRL } from '@qwik.dev/core';
import { Soundboards, type BoardSound } from '../../lib/soundboards';
import { Icon } from '../dashboard/icons';
import styles from './board-keys.css?inline';

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const STOP_KEY = 'M';
const OVERLAP_FADE_MS = 80;
const HOLD_FADE_MS = 120;
const STOP_FADE_MS = 100;
const MILLISECONDS = 1000;

interface Voice {
  stop: (fadeMs: number) => void;
}

interface Engine {
  context: AudioContext;
  buffers: Map<string, Promise<AudioBuffer | null>>;
  voices: Map<number, Voice>;
}

interface BoardKeysProps {
  boardName: string;
  sounds: BoardSound[];
  editable?: boolean;
  placing?: string | null;
  busy?: boolean;
  onPlayed$?: QRL<(soundId: string) => void>;
  onSwap$?: QRL<(from: number, to: number) => void>;
  onMoveToEnd$?: QRL<(from: number) => void>;
  onRemove$?: QRL<(index: number) => void>;
  onAdd$?: QRL<() => void>;
  onPlace$?: QRL<() => void>;
}

const EDITABLE_TARGET = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

const codeOf = (letter: string) => `Key${letter}`;
const isTyping = (event: Event) => event.target instanceof Element && event.target.closest(EDITABLE_TARGET) !== null;
const indexOfCode = (code: string) => Soundboards.KEYS.split('').findIndex((letter) => codeOf(letter) === code);

export const BoardKeys = component$<BoardKeysProps>((props) => {
  useStyles$(styles);
  const { boardName, sounds, editable = false, placing = null, busy = false } = props;
  const engine = useSignal<NoSerialize<Engine>>();
  const state = useStore({
    prepared: false,
    overlap: true,
    hold: false,
    shift: false,
    pressed: [] as number[],
    sustained: [] as number[],
    playing: {} as Record<number, number>,
    durations: {} as Record<number, number>,
    selected: null as number | null,
    labels: {} as Record<string, string>,
  });

  const ensureEngine = $(() => {
    const current = engine.value ?? { context: new AudioContext(), buffers: new Map(), voices: new Map() };
    engine.value = noSerialize(current);
    current.context.state === 'suspended' && current.context.resume();
    return current;
  });

  const load = $(async (sound: BoardSound) => {
    const current = await ensureEngine();
    const cached = current.buffers.get(sound.id);
    if ( cached ) { return cached; }
    const decode = async () => {
      if ( !sound.audioUrl ) { return null; }
      const response = await fetch(sound.audioUrl);
      if ( !response.ok ) { throw new Error(`HTTP ${response.status}`); }
      return current.context.decodeAudioData(await response.arrayBuffer());
    };
    const request = decode().catch((error: unknown) => {
      console.error(`[BoardKeys] ${sound.name} could not be decoded, playing it as a stream.`, error);
      return null;
    });
    current.buffers.set(sound.id, request);
    return request;
  });

  const prepare = $(async () => {
    if ( state.prepared ) { return; }
    state.prepared = true;
    const layout = (navigator as Navigator & { keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> } }).keyboard;
    const hasLabels = Object.keys(state.labels).length > 0;
    if (!hasLabels && layout?.getLayoutMap) {
      const map = await layout.getLayoutMap().catch(() => null);
      const labels: Record<string, string> = {};
      for (const letter of ROWS.join('')) {
        const label = map?.get(codeOf(letter));
        label && (labels[letter] = label.toUpperCase());
      }
      state.labels = labels;
    }
    for (const sound of sounds) {
      load(sound);
    }
  });

  const finish = $((index: number, voice: Voice) => {
    const current = engine.value;
    if ( current?.voices.get(index) !== voice ) { return; }
    current.voices.delete(index);
    state.playing = Object.fromEntries(Object.entries(state.playing).filter(([key]) => Number(key) !== index));
    state.sustained = state.sustained.filter((item) => item !== index);
  });

  const stopVoice = $((index: number, fadeMs: number) => {
    engine.value?.voices.get(index)?.stop(fadeMs);
  });

  const stopAll = $(() => {
    for (const voice of engine.value?.voices.values() ?? []) {
      voice.stop(STOP_FADE_MS);
    }
    state.sustained = [];
  });

  const start = $(async (index: number) => {
    const sound = sounds[index];
    if ( !sound ) { return; }
    const current = await ensureEngine();
    if (!state.overlap) {
      for (const [playing, voice] of current.voices) {
        playing !== index && voice.stop(OVERLAP_FADE_MS);
      }
    }
    current.voices.get(index)?.stop(0);
    const buffer = await load(sound);
    let voice: Voice;
    if (buffer) {
      const source = current.context.createBufferSource();
      const gain = current.context.createGain();
      source.buffer = buffer;
      source.connect(gain).connect(current.context.destination);
      voice = {
        stop: (fadeMs) => {
          const end = current.context.currentTime + fadeMs / MILLISECONDS;
          gain.gain.setValueAtTime(gain.gain.value, current.context.currentTime);
          gain.gain.linearRampToValueAtTime(0, end);
          source.stop(end);
        },
      };
      source.onended = () => finish(index, voice);
      source.start();
      state.durations = { ...state.durations, [index]: buffer.duration };
    } else {
      if ( !sound.audioUrl ) { return; }
      const element = new Audio(sound.audioUrl);
      voice = { stop: () => element.pause() };
      element.onended = () => finish(index, voice);
      element.onpause = () => finish(index, voice);
      element.play().catch((error: unknown) => console.error(`[BoardKeys] ${sound.name} could not be played.`, error));
    }
    current.voices.set(index, voice);
    state.playing = { ...state.playing, [index]: (state.playing[index] ?? 0) + 1 };
    props.onPlayed$?.(sound.id);
  });

  const press = $(async (index: number) => {
    const isEmpty = index >= sounds.length;
    if (isEmpty) {
      placing && props.onPlace$?.();
      return;
    }
    !state.pressed.includes(index) && (state.pressed = [...state.pressed, index]);
    await start(index);
  });

  const release = $((index: number) => {
    state.pressed = state.pressed.filter((item) => item !== index);
    if ( !state.hold || !state.playing[index] ) { return; }
    if ( state.shift ) { state.sustained = [...state.sustained, index]; return; }
    stopVoice(index, HOLD_FADE_MS);
  });

  const releaseShift = $(() => {
    state.shift = false;
    if ( !state.hold ) { return; }
    for (const index of state.sustained) {
      !state.pressed.includes(index) && stopVoice(index, HOLD_FADE_MS);
    }
    state.sustained = [];
  });

  const onKeyDown = $(async (event: KeyboardEvent) => {
    if ( event.code === 'ShiftLeft' || event.code === 'ShiftRight' ) { state.shift = true; return; }
    if ( event.code === 'Escape' || event.code === codeOf(STOP_KEY) ) { await stopAll(); return; }
    const index = indexOfCode(event.code);
    if ( index < 0 ) { return; }
    event.preventDefault();
    await prepare();
    await press(index);
  });

  const onKeyUp = $(async (event: KeyboardEvent) => {
    if ( event.code === 'ShiftLeft' || event.code === 'ShiftRight' ) { await releaseShift(); return; }
    const index = indexOfCode(event.code);
    index >= 0 && (await release(index));
  });

  useOnDocument('keydown', $(async (event) => {
    const keyboard = event as KeyboardEvent;
    const hasModifier = keyboard.ctrlKey || keyboard.metaKey || keyboard.altKey;
    if ( hasModifier || keyboard.repeat || isTyping(keyboard) ) { return; }
    await onKeyDown(keyboard);
  }));

  useOnDocument('keyup', $(async (event) => {
    !isTyping(event) && (await onKeyUp(event as KeyboardEvent));
  }));

  useOnWindow('blur', $(async () => {
    state.pressed = [];
    state.shift = false;
    state.hold && (await stopAll());
  }));

  const choose = $(async (index: number) => {
    const isEmpty = index >= sounds.length;
    const selected = state.selected;
    if (isEmpty) {
      if ( placing ) { await props.onPlace$?.(); return; }
      if ( selected !== null ) { state.selected = null; await props.onMoveToEnd$?.(selected); return; }
      await props.onAdd$?.();
      return;
    }
    if ( selected === null ) { state.selected = index; return; }
    state.selected = null;
    selected !== index && (await props.onSwap$?.(selected, index));
  });

  const playingIndexes = Object.keys(state.playing).map(Number);
  const firstPlaying = playingIndexes.length ? sounds[playingIndexes[0]]?.name : null;
  const extra = playingIndexes.length > 1 ? ` + ${playingIndexes.length - 1} more` : '';
  const status = firstPlaying ? `Playing ${firstPlaying}${extra}` : `${sounds.length} ${sounds.length === 1 ? 'sound' : 'sounds'} on the keys`;
  const hint = editable ? 'Click a key, then another to swap them. Letters still preview.' : 'Press Q to N on your keyboard, or click a key. M or Esc stops everything.';
  let slot = 0;

  return (
    <section class={['keys', editable && 'keys--edit', placing && 'keys--placing']} aria-label={`${boardName} keyboard`} onPointerEnter$={prepare}>
      <div class="keys__bar">
        <span class={['keys__eq', playingIndexes.length > 0 && 'keys__eq--on']} aria-hidden="true"><span /><span /><span /><span /></span>
        <span class="keys__status" role="status">{status}</span>
        <label class="keys__switch">
          <input type="checkbox" role="switch" class="switch" checked={state.overlap} onChange$={(_, input) => (state.overlap = input.checked)} />
          Overlap
        </label>
        <label class="keys__switch">
          <input type="checkbox" role="switch" class="switch" checked={state.hold} onChange$={(_, input) => (state.hold = input.checked)} />
          Hold to play
        </label>
        <button type="button" class="button button--secondary button--sm" onClick$={stopAll}>
          Stop all <kbd class="kbd">Esc</kbd>
        </button>
      </div>
      <div class="keys__board" role="group" aria-label={`${boardName}, ${sounds.length} sounds. Press Q to N to play, M or Escape to stop.`} aria-busy={busy}>
        {ROWS.map((row, rowIndex) => (
          <div key={row} class={['keys__row', `keys__row--${rowIndex + 1}`]}>
            {row.split('').map((letter) => {
              const label = state.labels[letter] ?? letter;
              if (letter === STOP_KEY) {
                return (
                  <button key={letter} type="button" class="key key--stop" aria-keyshortcuts={letter} onClick$={stopAll}>
                    <kbd class="key__cap">{label}</kbd>
                    <span class="key__name">Stop all</span>
                  </button>
                );
              }
              const index = slot++;
              const sound = sounds.at(index);
              if (!sound) {
                const action = placing ? 'Place here' : editable ? '+ Add sound' : '';
                return (
                  <button
                    key={letter}
                    type="button"
                    class="key key--empty"
                    aria-keyshortcuts={letter}
                    aria-label={action ? `${label}: ${action}` : `${label}: empty`}
                    disabled={!editable && !placing}
                    onClick$={() => choose(index)}
                  >
                    <kbd class="key__cap">{label}</kbd>
                    {action && <span class="key__name">{action}</span>}
                  </button>
                );
              }
              const presses = state.playing[index];
              const isPressed = state.pressed.includes(index);
              const isSustained = state.sustained.includes(index);
              return (
                <div key={letter} class={['key', !!presses && 'key--playing', isPressed && 'key--pressed', isSustained && 'key--sustained', state.selected === index && 'key--selected']}>
                  <button
                    type="button"
                    class="key__hit"
                    aria-keyshortcuts={letter}
                    aria-label={`${label}: ${sound.name}`}
                    aria-pressed={editable ? state.selected === index : undefined}
                    onPointerDown$={() => !editable && press(index)}
                    onPointerUp$={() => !editable && release(index)}
                    onPointerLeave$={() => !editable && state.pressed.includes(index) && release(index)}
                    onClick$={() => editable && choose(index)}
                  >
                    <kbd class="key__cap">{label}</kbd>
                    <span class="key__name">{sound.name}</span>
                    {!!presses && <span key={presses} class="key__progress" style={{ '--key-duration': state.durations[index] ?? 1 }} />}
                  </button>
                  {editable && (
                    <button type="button" class="key__remove" aria-label={`Remove ${sound.name} from ${label}`} disabled={busy} onClick$={() => props.onRemove$?.(index)}>
                      <Icon name="close" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p class="caption keys__hint">{hint}</p>
    </section>
  );
});
