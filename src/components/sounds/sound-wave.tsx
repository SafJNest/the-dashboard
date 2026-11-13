import { component$, useSignal, useVisibleTask$ } from '@qwik.dev/core';

const BARS = 180;
const FLOOR = 0.06;
const SAMPLES_PER_BAR = 2048;

const SYNTH = Array.from({ length: BARS }, (_, index) => {
  const position = index / BARS;
  return FLOOR + Math.abs(Math.sin(position * Math.PI * 7) * Math.sin(position * Math.PI * 1.6 + 0.5)) * (1 - FLOOR);
});

async function readPeaks(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Audio request failed (${response.status})`);
  const audio = await new OfflineAudioContext(1, 1, 44100).decodeAudioData(await response.arrayBuffer());
  const channels = Array.from({ length: audio.numberOfChannels }, (_, index) => audio.getChannelData(index));
  const size = Math.max(1, Math.floor(audio.length / BARS));
  const step = Math.max(1, Math.floor(size / SAMPLES_PER_BAR));
  const levels = Array.from({ length: BARS }, (_, bar) => {
    const end = Math.min(audio.length, (bar + 1) * size);
    let sum = 0;
    let count = 0;
    for (const data of channels) {
      for (let sample = bar * size; sample < end; sample += step) {
        sum += data[sample] * data[sample];
        count++;
      }
    }
    return count ? Math.sqrt(sum / count) : 0;
  });
  const max = Math.max(...levels);
  return levels.map((level) => FLOOR + (max ? level / max : 0) * (1 - FLOOR));
}

function Bars({ heights, played }: { heights: number[]; played?: boolean }) {
  return (
    <div class={['sound-wave__bars', played && 'sound-wave__bars--played']}>
      {heights.map((height, index) => (
        <span key={index} style={{ '--i': String(index), '--h': height.toFixed(3) }} />
      ))}
    </div>
  );
}

interface SoundWaveProps {
  url: string | null;
  duration: number | null;
  playing: boolean;
  buffering: boolean;
}

export const SoundWave = component$<SoundWaveProps>(({ url, duration, playing, buffering }) => {
  const peaks = useSignal<number[] | null>(null);
  const failed = useSignal(!url);

  useVisibleTask$(({ cleanup }) => {
    if (!url) return;
    const controller = new AbortController();
    cleanup(() => controller.abort());
    readPeaks(url, controller.signal).then(
      (values) => {
        peaks.value = values;
      },
      () => {
        if (!controller.signal.aborted) failed.value = true;
      },
    );
  });

  const heights = peaks.value ?? SYNTH;

  return (
    <div
      class={[
        'sound-wave',
        !peaks.value && !failed.value && 'sound-wave--loading',
        failed.value && 'sound-wave--idle',
        playing && !!duration && 'sound-wave--playing',
        buffering && 'sound-wave--buffering',
      ]}
      style={{ '--duration': `${duration ?? 0}s` }}
      aria-hidden="true"
    >
      <Bars heights={heights} />
      <Bars heights={heights} played />
    </div>
  );
});
