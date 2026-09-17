const KEYS = ['hideLikes', 'hideReposts', 'hideBookmarks'];
const DEFAULTS = {
  hideLikes: true,
  hideReposts: true,
  hideBookmarks: true,
};

const statusEl = document.getElementById('status');

async function load() {
  const data = await chrome.storage.sync.get(DEFAULTS);
  for (const key of KEYS) {
    document.getElementById(key).checked = data[key] !== false;
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
