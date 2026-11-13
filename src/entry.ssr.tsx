import { createRenderer } from '@qwik.dev/router';
import Root from './root';

export default createRenderer((opts) => ({
  jsx: <Root />,
  options: {
    ...opts,
    containerAttributes: { lang: 'en', ...opts.containerAttributes },
    serverData: {
      ...opts.serverData,
      documentHead: {
        links: [{ key: 'favicon', rel: 'icon', type: 'image/png', href: '/favicon.png' }],
      },
    },
  },
}));
