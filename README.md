# Quietsky

![Version](https://img.shields.io/badge/version-1.3.1-1083fe)
![Chrome](https://img.shields.io/badge/Chrome-Manifest%20V3-1083fe?logo=googlechrome&logoColor=white)
[![Support me on Ko-fi](https://img.shields.io/badge/Support%20me-Ko--fi-FF5E5B?logo=kofi&logoColor=white)](https://ko-fi.com/boni0610)

Chrome extension for [bsky.app](https://bsky.app) that:

1. Hides **like**, **repost**, and **bookmark** counts (buttons stay usable; each type has its own toggle).
2. Renews **mute words** that already have a past expiry date, so they are forever again.

## Setup

1. Download the latest `quietsky-v*.zip` from [Releases](https://github.com/boni1921/quietsky/releases).
2. Unzip it to a folder you will keep (Chrome needs that folder to stay on disk).
3. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the unzipped folder.
4. Open [bsky.app](https://bsky.app) and click the extension icon to toggle:
   - **Likes** — feed counts + “N likes” on post pages
   - **Reposts** — feed counts + “N reposts” / “N quotes” on post pages
   - **Bookmarks** — “N saves” on post pages
   - **Show mine only** — when on, keep counts on your own posts; still hide them on everyone else’s

If you cloned the repo, you can **Load unpacked** on the repo root instead.

Likes / Reposts / Bookmarks are **on** (hidden) by default. **Show mine only** is **off** by default.

## Muted words

You must be signed in on bsky.app. No app password. The extension reads the session already in the page and does not save that token in extension storage.

### What it does

Each time you open bsky.app or return to that tab, the extension checks your mute words:

- A word counts as **expired** only when it has an `expiresAt` already in the past.
- Words with no date, and words whose date is still in the future, are left alone.
- If any are expired, it clears those dates (forever again).

### What you see

- After a successful renew, a blue bar appears under the Discover / Feeds row:

  `N muted words expired. Renewed.`

  That bar means the renew already succeeded. It fades out and is gone after 3 seconds.
- If nothing is expired, there is no bar.
- If the renew fails, there is no bar. The popup still lists the expired words and shows the error.

### Popup

Open the extension popup while bsky.app is open:

- Shows how many mute words are expired.
- The external-link control on the **Muted words** heading opens [Bluesky moderation / mute settings](https://bsky.app/moderation).
- **View** and **Renew all** appear only when at least one word is expired. View lists each word and when it expired; Renew all clears those dates the same way as the automatic renew (no second bar).
- If bsky.app is not open, renew still asks you to open it (or reload the tab if the content script is stale).

## Notes

- Relies on Bluesky’s `data-testid` attributes (`likeCount`, `repostCount`, `bookmarkCount-expanded`, etc.).
- **Show mine only** reads the signed-in account from `localStorage` `BSKY_STORAGE` and from the shell Profile link next to Settings (`/profile/{handle}`, same as `makeProfileLink`). Own posts match `feedItem-by-{handle}` / `postThreadItem-by-{handle}`. No app password or API access.
- Mute-word scan uses the signed-in session already in `BSKY_STORAGE` and calls your PDS `getPreferences` / `putPreferences`. The token is not copied into extension storage.
- Content scripts on `bsky.app`, plus host access to `bsky.social` and `*.host.bsky.network`.

## Changelog

- **1.3.1** — Popup link to Bluesky mute settings; hide View / Renew when nothing is expired.
- **1.3.0** — Rename to Quietsky (extension id classes, release zip, and repo).
- **1.2.2** — The renewed-mute message is a bar on the bsky.app tab.
- **1.2.1** — When a visit finds expired mute words, renew them and show a notification.
- **1.2.0** — On each bsky.app visit, count expired mute words. View lists them; Renew all clears their expiry.
- **1.0.0** — Hide likes / reposts / bookmarks with independent toggles.
