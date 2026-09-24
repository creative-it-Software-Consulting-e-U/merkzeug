// Pick a useful initial view by viewport width, then respect each explicit choice.
const compact = window.matchMedia('(max-width: 700px)');
for (const gallery of document.querySelectorAll('[data-gallery]')) {
  const image = gallery.querySelector('img');
  const picture = gallery.querySelector('picture');
  const fullImage = gallery.querySelector('[data-full-image]');
  const buttons = gallery.querySelectorAll('[data-view]');
  let chosen = null;
  const render = () => {
    const view = chosen || (compact.matches ? 'mobile' : 'desktop');
    // The picture source is the no-JavaScript fallback; remove it for manual switching.
    picture.querySelector('source')?.remove();
    // Reserve space before lazy images load, so fragment links keep their target.
    image.width = Number(image.dataset[`${view}Width`]);
    image.height = Number(image.dataset[`${view}Height`]);
    image.src = image.dataset[view];
    fullImage.href = image.src;
    gallery.dataset.view = view;
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.view === view));
  };
  for (const button of buttons) button.addEventListener('click', () => {
    chosen = button.dataset.view;
    render();
  });
  compact.addEventListener('change', render);
  render();
}

// Replace the fallback only after the iframe reports its plugin data. A script
// or iframe load event alone also fires for incomplete/failed widget loads.
const marketplaces = document.querySelectorAll('[data-marketplace-widget]');
for (const marketplace of marketplaces) {
  const fallback = marketplace.parentElement.querySelector('.button');
  const onReady = (event) => {
    const frame = marketplace.querySelector('iframe');
    if (event.origin !== 'https://plugins.jetbrains.com' || !frame ||
        event.source !== frame.contentWindow ||
        event.data?.type !== 'marketplace/post_plugin' || !event.data.payload?.link) return;
    fallback.hidden = true;
    marketplace.hidden = false;
    window.removeEventListener('message', onReady);
  };
  window.addEventListener('message', onReady);
}
if (marketplaces.length) {
  const script = document.createElement('script');
  script.src = 'https://plugins.jetbrains.com/assets/scripts/mp-widget.js';
  script.async = true;
  script.addEventListener('load', () => {
    for (const marketplace of marketplaces) {
      window.MarketplaceWidget?.setupMarketplaceWidget('install', 34221, '#' + marketplace.id);
    }
  });
  document.head.append(script);
}
