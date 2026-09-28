(() => {
  'use strict';

  const DEFAULTS = {
    hideLikes: true,
    hideReposts: true,
    hideBookmarks: true,
    showOwnOnly: false,
  };

  const KEYS = ['hideLikes', 'hideReposts', 'hideBookmarks', 'showOwnOnly'];

  const CLASS_MAP = {
    hideLikes: 'quietsky-hide-likes',
    hideReposts: 'quietsky-hide-reposts',
    hideBookmarks: 'quietsky-hide-bookmarks',
    showOwnOnly: 'quietsky-show-own-only',
  };

  const POST_SELECTOR =
    '[data-testid^="feedItem-by-"], [data-testid^="postThreadItem-by-"]';
  const POST_CLASS = 'quietsky-post';
  const OWN_CLASS = 'quietsky-own-post';
  const BSKY_STORAGE_KEY = 'BSKY_STORAGE';

  /** @type {Set<string>} */
  let selfActors = new Set();
  let showOwnOnly = false;
  let observerStarted = false;
  /** @type {ReturnType<typeof setInterval> | null} */
  let retryTimer = null;

  function applyClasses(settings) {
    const root = document.documentElement;
    for (const [key, className] of Object.entries(CLASS_MAP)) {
      const on =
        key === 'showOwnOnly'
          ? Boolean(settings[key])
          : settings[key] !== false;
      root.classList.toggle(className, on);
    }
  }

  function normalizeActor(value) {
    if (!value) return null;
    let s = String(value).trim().toLowerCase();
    if (!s) return null;
    if (s.startsWith('@')) s = s.slice(1);
    try {
      s = decodeURIComponent(s);
    } catch {
      // keep raw
    }
    if (s.startsWith('did:')) return s;
    return s.replace(/^\/profile\//, '').split(/[/?#]/)[0] || null;
  }

  function addSelfActor(value) {
    const key = normalizeActor(value);
    if (!key) return;
    selfActors.add(key);
    if (!key.startsWith('did:') && key.endsWith('.bsky.social')) {
      selfActors.add(key.slice(0, -'.bsky.social'.length));
    } else if (!key.startsWith('did:') && !key.includes('.')) {
      selfActors.add(`${key}.bsky.social`);
    }
  }

  function isSelfActor(actor) {
    const key = normalizeActor(actor);
    if (!key || selfActors.size === 0) return false;
    if (selfActors.has(key)) return true;
    if (!key.startsWith('did:')) {
      if (key.endsWith('.bsky.social')) {
        return selfActors.has(key.slice(0, -'.bsky.social'.length));
      }
      return selfActors.has(`${key}.bsky.social`);
    }
    return false;
  }

  /**
   * Bluesky web: localStorage BSKY_STORAGE.session =
   * { accounts, currentAccount } (see social-app persisted/index.web.ts)
   */
  function readSelfFromStorage() {
    try {
      const raw = localStorage.getItem(BSKY_STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      const session = data?.session;
      if (!session) return false;

      const current = session.currentAccount;
      const accounts = Array.isArray(session.accounts) ? session.accounts : [];

      let did = current?.did ? String(current.did) : null;
      let handle = current?.handle ? String(current.handle) : null;

      if (did) {
        const full = accounts.find(
          (a) => String(a?.did || '').toLowerCase() === did.toLowerCase(),
        );
        if (full?.did) did = String(full.did);
        if (full?.handle) handle = String(full.handle);
      }

      if (!did && !handle && accounts.length === 1) {
        did = accounts[0]?.did ? String(accounts[0].did) : null;
        handle = accounts[0]?.handle ? String(accounts[0].handle) : null;
      }

      if (did) addSelfActor(did);
      if (handle) addSelfActor(handle);
      return Boolean(did || handle);
    } catch {
      return false;
    }
  }

  const INSIDE_POST =
    '[data-testid^="feedItem-by-"], [data-testid^="postThreadItem-by-"]';

  function isShellProfileHref(href) {
    const path = String(href || '').split('?')[0];
    return /^\/profile\/[^/]+\/?$/.test(path);
  }

  /**
   * Desktop left nav Profile is an <a href="/profile/{handle}"> with an icon,
   * not an avatar (LeftNav NavItem next to /settings). Bottom bar may wrap
   * UserAvatar. Never use translated aria-labels.
   */
  function readSelfFromDom() {
    let found = false;

    const anchor =
      document.querySelector('a[href="/settings"]') ||
      document.querySelector('a[href="/saved"]');
    const shell =
      anchor?.closest('nav') ||
      anchor?.parentElement?.parentElement ||
      anchor?.parentElement;
    if (shell) {
      for (const link of shell.querySelectorAll('a[href^="/profile/"]')) {
        if (link.closest(INSIDE_POST)) continue;
        const href = link.getAttribute('href') || '';
        if (!isShellProfileHref(href)) continue;
        addSelfActor(href);
        found = true;
        const img = link.querySelector('img[src]');
        const didMatch = (img?.getAttribute('src') || '').match(
          /\/(did:[^/]+)\//i,
        );
        if (didMatch) addSelfActor(didMatch[1]);
      }
    }

    const shellAvatars = document.querySelectorAll(
      'a[href^="/profile/"] img[src*="/did:"]',
    );
    for (const img of shellAvatars) {
      if (img.closest(INSIDE_POST)) continue;
      const link = img.closest('a[href^="/profile/"]');
      if (!link || link.closest(INSIDE_POST)) continue;
      const href = link.getAttribute('href') || '';
      if (!isShellProfileHref(href)) continue;
      const didMatch = (img.getAttribute('src') || '').match(
        /\/(did:[^/]+)\//i,
      );
      if (didMatch) addSelfActor(didMatch[1]);
      addSelfActor(href);
      found = true;
    }

    return found;
  }

  function refreshSelf() {
    selfActors = new Set();
    const fromStorage = readSelfFromStorage();
    const fromDom = readSelfFromDom();
    return fromStorage || fromDom || selfActors.size > 0;
  }

  function handleFromTestId(el) {
    const id = el.getAttribute('data-testid') || '';
    const match = id.match(/^(?:feedItem|postThreadItem)-by-(.+)$/);
    return match ? match[1] : null;
  }

  function didFromAvatar(root) {
    const img =
      root.querySelector?.('[data-testid="userAvatarImage"] img[src]') ||
      root.querySelector?.('img[src*="/did:"]');
    const src = img?.getAttribute('src') || '';
    const match = src.match(/\/(did:[^/]+)\//i);
    return match ? match[1] : null;
  }

  function authorHrefInPost(root) {
    const author = normalizeActor(handleFromTestId(root));
    const links = root.querySelectorAll?.('a[href^="/profile/"]') || [];
    for (const link of links) {
      const href = link.getAttribute('href') || '';
      if (!isShellProfileHref(href)) continue;
      const actor = normalizeActor(href);
      if (author && actor) {
        const same =
          actor === author ||
          actor === `${author}.bsky.social` ||
          `${actor}.bsky.social` === author;
        if (!same) continue;
      }
      return href;
    }
    return null;
  }

  function markPost(el) {
    el.classList.add(POST_CLASS);
    const handle = handleFromTestId(el);
    const did = didFromAvatar(el);
    const authorHref = authorHrefInPost(el);
    const own =
      isSelfActor(handle) || isSelfActor(did) || isSelfActor(authorHref);
    el.classList.toggle(OWN_CLASS, own);
  }

  function markAllPosts(root = document) {
    if (!showOwnOnly) return;
    // Re-read self if still unknown so late BSKY_STORAGE / shell avatar works
    if (selfActors.size === 0) refreshSelf();
    for (const el of root.querySelectorAll?.(POST_SELECTOR) || []) {
      markPost(el);
    }
    if (root.nodeType === 1 && root.matches?.(POST_SELECTOR)) {
      markPost(root);
    }
  }

  function clearMarks() {
    for (const el of document.querySelectorAll(`.${POST_CLASS}`)) {
      el.classList.remove(POST_CLASS, OWN_CLASS);
    }
  }

  function remarkAll() {
    if (!showOwnOnly) return;
    refreshSelf();
    markAllPosts();
  }

  function startObserver() {
    if (observerStarted) return;
    observerStarted = true;
    const obs = new MutationObserver((mutations) => {
      if (!showOwnOnly) return;
      let needMark = false;
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          needMark = true;
          markAllPosts(node);
        }
      }
      // Shell avatar may appear after posts — refresh self occasionally
      if (needMark && selfActors.size === 0) {
        remarkAll();
      }
    });
    const target = document.body || document.documentElement;
    obs.observe(target, { childList: true, subtree: true });
  }

  function stopRetry() {
    if (retryTimer != null) {
      clearInterval(retryTimer);
      retryTimer = null;
    }
  }

  function startRetryUntilSelf() {
    stopRetry();
    if (!showOwnOnly) return;
    let attempts = 0;
    retryTimer = setInterval(() => {
      attempts += 1;
      const ok = refreshSelf();
      markAllPosts();
      if (ok || attempts >= 20) stopRetry();
    }, 500);
  }

  async function load() {
    const data = await chrome.storage.sync.get(DEFAULTS);
    const settings = { ...DEFAULTS, ...data };
    showOwnOnly = Boolean(settings.showOwnOnly);
    applyClasses(settings);

    if (showOwnOnly) {
      refreshSelf();
      markAllPosts();
      startObserver();
      startRetryUntilSelf();
    } else {
      stopRetry();
      clearMarks();
    }
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (!KEYS.some((key) => key in changes)) return;
    load();
  });

  // Account switch / session write from another tab
  window.addEventListener('storage', (e) => {
    if (!showOwnOnly) return;
    if (e.key && e.key !== BSKY_STORAGE_KEY) return;
    remarkAll();
  });

  // Same-tab writes don't fire `storage`; poll lightly while own-only is on
  // via startRetryUntilSelf, and also refresh on focus.
  window.addEventListener('focus', () => {
    if (showOwnOnly) remarkAll();
  });

  load();
})();
