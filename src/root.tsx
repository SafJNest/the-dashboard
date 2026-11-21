import { component$, useContextProvider, useStore, useVisibleTask$ } from '@qwik.dev/core';
import { DocumentHeadTags, RouterOutlet, useQwikRouter } from '@qwik.dev/router';
import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { emptySearch, SearchContext } from './components/catalog/catalog-context';
import './global.css';

export default component$(() => {
  useQwikRouter();
  useContextProvider(SearchContext, useStore(emptySearch()));
  useVisibleTask$(() => {
    inject({ framework: 'qwik' });
    injectSpeedInsights({ framework: 'qwik' });
  }, { strategy: 'document-idle' });
  return (
    <>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&family=Schibsted+Grotesk:wght@500;600;700&display=swap"
        />
        <DocumentHeadTags />
      </head>
      <body><RouterOutlet /></body>
    </>
  );
});
