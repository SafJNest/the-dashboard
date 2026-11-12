import { component$ } from '@qwik.dev/core';
import type { RequestHandler } from '@qwik.dev/router';

export const onGet: RequestHandler = ({ internalRequest, redirect }) => {
  if (!internalRequest) throw redirect(302, '/dashboard/me/sounds/');
};

export default component$(() => null);
