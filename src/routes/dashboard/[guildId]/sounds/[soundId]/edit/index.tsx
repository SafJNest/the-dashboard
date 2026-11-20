import { component$ } from '@qwik.dev/core';
import { useLocation, type DocumentHead } from '@qwik.dev/router';
import { SoundEditorPage } from '../../../../../../components/sounds/sound-editor';
import { useDeleteSound, useRemoveSoundImage, useSearchTags, useSetSoundImage, useSound, useSoundImage, useUpdateSound } from '../../../../../../lib/sound-editor';
import { useGuild } from '../../../layout';

export { useDeleteSound, useRemoveSoundImage, useSearchTags, useSetSoundImage, useSound, useSoundImage, useUpdateSound };

export default component$(() => {
  const location = useLocation();
  return <SoundEditorPage guildId={location.params.guildId} />;
});

export const head: DocumentHead = ({ resolveValue }) => ({
  title: `${resolveValue(useGuild).name} | Edit ${resolveValue(useSound).name}`,
});
