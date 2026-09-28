(() => {
  'use strict';

  const STORAGE_KEY = 'BSKY_STORAGE';
  const SCAN_KEY = 'mutedWordScan';
  const MUTED_WORDS_TYPE = 'app.bsky.actor.defs#mutedWordsPref';
  const DEFAULT_PDS = 'https://bsky.social';

  let scanning = false;

  function contextAlive() {
    try {
      return Boolean(chrome.runtime && chrome.runtime.id);
    } catch {
      return false;
    }
  }

  function isInvalidated(err) {
    return /context invalidated/i.test(String(err?.message || err || ''));
  }

  function sessionAuth() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      const session = data?.session;
      if (!session) return null;
      const current = session.currentAccount;
      const accounts = Array.isArray(session.accounts) ? session.accounts : [];
      const did = current?.did ? String(current.did) : null;
      const account =
        (did &&
          accounts.find(
            (a) => String(a?.did || '').toLowerCase() === did.toLowerCase(),
          )) ||
        (accounts.length === 1 ? accounts[0] : null);
      const accessJwt = account?.accessJwt || current?.accessJwt;
      if (!accessJwt) return null;
      const pds = String(
        account?.pdsUrl || account?.service || current?.service || DEFAULT_PDS,
      ).replace(/\/$/, '');
      return { accessJwt, pds };
    } catch {
      return null;
    }
  }

  function isExpired(word, now) {
    if (!word?.expiresAt) return false;
    const time = Date.parse(word.expiresAt);
    return Number.isFinite(time) && time < now;
  }

  async function fetchPreferences(auth) {
    const res = await fetch(`${auth.pds}/xrpc/app.bsky.actor.getPreferences`, {
      headers: { Authorization: `Bearer ${auth.accessJwt}` },
    });
    if (!res.ok) {
      throw new Error(`getPreferences ${res.status}`);
    }
    const body = await res.json();
    if (!Array.isArray(body?.preferences)) {
      throw new Error('getPreferences missing preferences');
    }
    return body.preferences;
  }

  function expiredFromPreferences(preferences) {
    const now = Date.now();
    const pref = preferences.find((p) => p?.$type === MUTED_WORDS_TYPE);
    const items = Array.isArray(pref?.items) ? pref.items : [];
    return items
      .filter((word) => isExpired(word, now))
      .map((word) => ({
        value: String(word.value || ''),
        expiresAt: String(word.expiresAt),
      }));
  }

  async function saveScan(scan) {
    if (!contextAlive()) return;
    try {
      await chrome.storage.local.set({ [SCAN_KEY]: scan });
    } catch (err) {
      if (!isInvalidated(err)) throw err;
    }
  }

  async function scan() {
    if (scanning) return null;
    scanning = true;
    try {
      const auth = sessionAuth();
      if (!auth) {
        const scanResult = {
          expired: [],
          checkedAt: Date.now(),
          error: 'Not signed in',
        };
        await saveScan(scanResult);
        return scanResult;
      }
      const preferences = await fetchPreferences(auth);
      const scanResult = {
        expired: expiredFromPreferences(preferences),
        checkedAt: Date.now(),
        error: null,
      };
      await saveScan(scanResult);
      return scanResult;
    } catch (err) {
      const scanResult = {
        expired: [],
        checkedAt: Date.now(),
        error: err?.message || 'Scan failed',
      };
      await saveScan(scanResult);
      return scanResult;
    } finally {
      scanning = false;
    }
  }

  async function renewAll() {
    const auth = sessionAuth();
    if (!auth) {
      const scanResult = {
        expired: [],
        checkedAt: Date.now(),
        error: 'Not signed in',
      };
      await saveScan(scanResult);
      return scanResult;
    }
    const preferences = await fetchPreferences(auth);
    const now = Date.now();
    let changed = false;
    const next = preferences.map((pref) => {
      if (pref?.$type !== MUTED_WORDS_TYPE || !Array.isArray(pref.items)) {
        return pref;
      }
      const items = pref.items.map((word) => {
        if (!isExpired(word, now)) return word;
        changed = true;
        const copy = { ...word };
        delete copy.expiresAt;
        return copy;
      });
      return { ...pref, items };
    });
    if (changed) {
      const res = await fetch(
        `${auth.pds}/xrpc/app.bsky.actor.putPreferences`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${auth.accessJwt}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ preferences: next }),
        },
      );
      if (!res.ok) {
        throw new Error(`putPreferences ${res.status}`);
      }
    }
    return scan();
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'bsky-filter-scan-mutes') {
      scan()
        .then((result) => sendResponse({ ok: true, result }))
        .catch((err) => sendResponse({ ok: false, error: err?.message }));
      return true;
    }
    if (message?.type === 'bsky-filter-renew-mutes') {
      renewAll()
        .then((result) => sendResponse({ ok: true, result }))
        .catch((err) =>
          sendResponse({ ok: false, error: err?.message || 'Renew failed' }),
        );
      return true;
    }
    return false;
  });

  let noticeTimer = null;

  function showMuteNotice(count) {
    const n = Number(count) || 0;
    if (n < 1) return;
    const noun = n === 1 ? 'word' : 'words';
    const previous = document.getElementById('bsky-filter-mute-notice');
    if (previous) previous.remove();
    if (noticeTimer != null) {
      clearTimeout(noticeTimer);
      noticeTimer = null;
    }
    const bar = document.createElement('div');
    bar.id = 'bsky-filter-mute-notice';
    bar.textContent = `${n} muted ${noun} expired. Renewed.`;
    (document.body || document.documentElement).appendChild(bar);
    noticeTimer = setTimeout(() => {
      bar.remove();
      noticeTimer = null;
    }, 6000);
  }

  async function checkAndRenew() {
    try {
      const result = await scan();
      if (!result?.expired?.length) return;
      const count = result.expired.length;
      const renewed = await renewAll();
      if (!renewed?.error) showMuteNotice(count);
    } catch (err) {
      if (!isInvalidated(err)) {
        console.warn('Bsky Filter mute check failed', err);
      }
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkAndRenew();
  });

  checkAndRenew();
})();
