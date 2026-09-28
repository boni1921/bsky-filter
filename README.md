# Bsky Filter

Chrome extension that hides **like**, **repost**, and **bookmark** counts on [bsky.app](https://bsky.app). Buttons stay usable; only the numbers (and expanded post stats) are hidden. Each type has its own toggle.

## Setup

1. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select this folder.
2. Open [bsky.app](https://bsky.app) and click the extension icon to toggle:
   - **Likes** — feed counts + “N likes” on post pages
   - **Reposts** — feed counts + “N reposts” / “N quotes” on post pages
   - **Bookmarks** — “N saves” on post pages
   - **Show mine only** — when on, keep counts on your own posts; still hide them on everyone else’s
3. **Muted words** — each time you open or return to bsky.app, the extension counts mute words whose `expiresAt` is already past. If any are expired, it renews them (clears the date) and shows a bar at the top of the tab: `N muted words expired. Renewed.` **View** lists any that are still expired. **Renew all** does the same renew from the popup without a second bar. bsky.app must be open.
4. `TEST_MUTE_NOTICE` at the top of `mute-words.js` is **on**. The first load of a bsky.app tab shows a sample bar (`3 muted words expired. Renewed.`) even when nothing is expired. Set it to `false` after you have seen it.

Likes / Reposts / Bookmarks are **on** (hidden) by default. **Show mine only** is **off** by default.

## Notes

- Relies on Bluesky’s `data-testid` attributes (`likeCount`, `repostCount`, `bookmarkCount-expanded`, etc.).
- **Show mine only** reads the signed-in account from `localStorage` `BSKY_STORAGE` and from the shell Profile link next to Settings (`/profile/{handle}`, same as `makeProfileLink`). Own posts match `feedItem-by-{handle}` / `postThreadItem-by-{handle}`. No app password or API access.
- Mute-word scan uses the signed-in session already in `BSKY_STORAGE` and calls your PDS `getPreferences` / `putPreferences`. The token is not copied into extension storage.
- Content scripts on `bsky.app`, plus host access to `bsky.social` and `*.host.bsky.network`.

## Changelog

- **1.2.2** — The renewed-mute message is a bar on the bsky.app tab. `TEST_MUTE_NOTICE` previews that bar.
- **1.2.1** — When a visit finds expired mute words, renew them and show a notification. `TEST_MUTE_NOTICE` previews that notification.
- **1.2.0** — On each bsky.app visit, count expired mute words. View lists them; Renew all clears their expiry.
- **1.1.3** — Detect the signed-in handle from the nav Profile link (desktop icon, not avatar) and match `feedItem-by-{handle}` so own counts show again.
- **1.1.2** — Fix Show mine only breaking hide: while on, hide all counts first (pending), then show only on `.bsky-filter-own-post` via `inline-block` (not `revert`).
- **1.1.1** — Reliable self detection via `BSKY_STORAGE` + locale-safe shell avatar fallback.
- **1.1.0** — Add Show mine only toggle.
- **1.0.0** — Hide likes / reposts / bookmarks with independent toggles.
