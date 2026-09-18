const KEYS = ['hideLikes', 'hideReposts', 'hideBookmarks', 'showOwnOnly'];
const DEFAULTS = {
  hideLikes: true,
  hideReposts: true,
  hideBookmarks: true,
  showOwnOnly: false,
};

const statusEl = document.getElementById('status');

async function load() {
  const data = await chrome.storage.sync.get(DEFAULTS);
  for (const key of KEYS) {
    const el = document.getElementById(key);
    if (key === 'showOwnOnly') {
      el.checked = Boolean(data[key]);
    } else {
      el.checked = data[key] !== false;
    }
  }
}

for (const key of KEYS) {
  document.getElementById(key).addEventListener('change', async (e) => {
    await chrome.storage.sync.set({ [key]: e.target.checked });
    statusEl.textContent = 'Saved';
    setTimeout(() => {
      statusEl.textContent = '';
    }, 1200);
  });
}

load();
