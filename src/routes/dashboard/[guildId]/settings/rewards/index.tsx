import { component$ } from '@qwik.dev/core';
import { useLocation, type DocumentHead, type RequestHandler } from '@qwik.dev/router';
import { RewardSettings } from '../../../../../components/guild/reward-settings';
import { isDocumentRequest, loaderResolver } from '../../../../../lib/beebot.server';
import { selectionRedirect } from '../../../../../lib/dashboard-path';
import { useGuild } from '../../layout';

export const onGet: RequestHandler = async (event) => {
  if (!isDocumentRequest(event)) return;
  const { guildId, level } = event.params;
  const target = selectionRedirect(event.url, 'level', guildId, 'rewards', level);
  if (target) throw event.redirect(301, target);
  if (level === undefined) return;
  const guild = await loaderResolver(event)(useGuild);
  if (!guild.settings.reward[level]) throw event.error(404, 'This reward level does not exist.');
};

export default component$(() => <RewardSettings level={useLocation().params.level} />);

export const head: DocumentHead = ({ resolveValue, params }) => ({
  title: `${resolveValue(useGuild).name} | Settings - Rewards${params.level ? ` · Level ${params.level}` : ''}`,
});
