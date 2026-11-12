import { component$ } from '@qwik.dev/core';
import type { RequestHandler } from '@qwik.dev/router';

export const onGet: RequestHandler = ({ internalRequest, params, redirect }) => {
  if (!internalRequest) throw redirect(302, `/dashboard/${params.guildId}/settings/`);
};

export default component$(() => null);
