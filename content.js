(() => {
  'use strict';

  const DEFAULTS = {
    hideLikes: true,
    hideReposts: true,
    hideBookmarks: true,
  };

  const KEYS = ['hideLikes', 'hideReposts', 'hideBookmarks'];

  const CLASS_MAP = {
    hideLikes: 'bsky-filter-hide-likes',
    hideReposts: 'bsky-filter-hide-reposts',
    hideBookmarks: 'bsky-filter-hide-bookmarks',
  };

  function apply(settings) {
    const root = document.documentElement;
    for (const [key, className] of Object.entries(CLASS_MAP)) {
      root.classList.toggle(className, settings[key] !== false);
    }
  }

  async function load() {
    const data = await chrome.storage.sync.get(DEFAULTS);
    apply({ ...DEFAULTS, ...data });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (!KEYS.some((key) => key in changes)) return;
    load();
  });

  load();
})();
