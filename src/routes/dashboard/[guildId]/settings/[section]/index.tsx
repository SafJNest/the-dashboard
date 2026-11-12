import { component$ } from '@qwik.dev/core';
import { useLocation, type DocumentHead, type RequestHandler } from '@qwik.dev/router';
import { AlertSettings } from '../../../../../components/guild/alert-settings';
import { BlacklistSettings } from '../../../../../components/guild/blacklist-settings';
import { ExperienceSettings } from '../../../../../components/guild/experience-settings';
import { GeneralSettings } from '../../../../../components/guild/general-settings';
import { ModerationSettings } from '../../../../../components/guild/moderation-settings';
import { findSection } from '../../../../../components/guild/sections';
import { useGuild } from '../../layout';

export const onGet: RequestHandler = ({ params, error }) => {
  if (!findSection(params.section)) throw error(404, 'Page not found.');
};

export default component$(() => {
  const { section } = useLocation().params;
  switch (section) {
    case 'welcome':
      return <AlertSettings key={section} kind="welcome" />;
    case 'leave':
      return <AlertSettings key={section} kind="leave" />;
    case 'boost':
      return <AlertSettings key={section} kind="boost" />;
    case 'experience':
      return <ExperienceSettings key={section} />;
    case 'level-up':
      return <AlertSettings key={section} kind="levelUp" />;
    case 'moderation':
      return <ModerationSettings key={section} />;
    case 'blacklist':
      return <BlacklistSettings key={section} />;
    case 'general':
      return <GeneralSettings key={section} />;
    default:
      return null;
  }
});

export const head: DocumentHead = ({ resolveValue, params }) => ({
  title: `${resolveValue(useGuild).name} | Settings - ${findSection(params.section)?.label}`,
});
