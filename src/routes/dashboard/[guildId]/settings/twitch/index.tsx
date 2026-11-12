import { component$ } from '@qwik.dev/core';
import { useLocation, type DocumentHead, type RequestHandler } from '@qwik.dev/router';
import { TwitchSettings } from '../../../../../components/guild/twitch-settings';
import { isDocumentRequest, loaderResolver } from '../../../../../lib/beebot.server';
import { selectionRedirect } from '../../../../../lib/dashboard-path';
import { useGuild } from '../../layout';

export const onGet: RequestHandler = async (event) => {
  if (!isDocumentRequest(event)) return;
  const { guildId, streamerId } = event.params;
  const target = selectionRedirect(event.url, 'streamer', guildId, 'twitch', streamerId);
  if (target) throw event.redirect(301, target);
  if (streamerId === undefined) return;
  const guild = await loaderResolver(event)(useGuild);
  if (!guild.settings.twitch[streamerId]) throw event.error(404, 'This streamer is not linked to the server.');
};

export default component$(() => <TwitchSettings streamerId={useLocation().params.streamerId} />);

export const head: DocumentHead = ({ resolveValue, params }) => ({
  title: `${resolveValue(useGuild).name} | Settings - Twitch alerts${params.streamerId ? ` · ${params.streamerId}` : ''}`,
});
