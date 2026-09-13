'use client';

import Script from 'next/script';

declare global {
  interface Window {
    VLibras?: {
      Widget: new (url: string) => unknown;
    };
  }
}

export default function VLibrasWidget() {
  function initializeWidget() {
    if (window.VLibras && !document.querySelector('[data-vlibras-initialized]')) {
      new window.VLibras.Widget('https://vlibras.gov.br/app');
      document.body.setAttribute('data-vlibras-initialized', 'true');
    }
  }

  return (
    <>
      <div {...{ vw: true }} className="enabled vlibras-widget" aria-label="VLibras">
        <div {...{ 'vw-access-button': true }} className="active" />
        <div {...{ 'vw-plugin-wrapper': true }}>
          <div className="vw-plugin-top-wrapper" />
        </div>
      </div>
      <Script
        src="https://vlibras.gov.br/app/vlibras-plugin.js"
        strategy="afterInteractive"
        onLoad={initializeWidget}
      />
    </>
  );
}
