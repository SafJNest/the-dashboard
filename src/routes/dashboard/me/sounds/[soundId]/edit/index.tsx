import { component$ } from '@qwik.dev/core';
import type { DocumentHead } from '@qwik.dev/router';
import { SoundEditorPage } from '../../../../../../components/sounds/sound-editor';
import { useDeleteSound, useRemoveSoundImage, useSearchTags, useSetSoundImage, useSound, useSoundImage, useUpdateSound } from '../../../../../../lib/sound-editor';

export { useDeleteSound, useRemoveSoundImage, useSearchTags, useSetSoundImage, useSound, useSoundImage, useUpdateSound };

export default component$(() => <SoundEditorPage guildId={null} />);

export const head: DocumentHead = ({ resolveValue }) => ({
  title: `${resolveValue(useSound).name} | Edit sound`,
});
