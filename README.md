# Bsky Filter

Chrome extension that hides **like**, **repost**, and **bookmark** counts on [bsky.app](https://bsky.app). Buttons stay usable; only the numbers (and expanded post stats) are hidden. Each type has its own toggle.

## Setup

1. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select this folder.
2. Open [bsky.app](https://bsky.app) and click the extension icon to toggle:
   - **Likes** — feed counts + “N likes” on post pages
   - **Reposts** — feed counts + “N reposts” / “N quotes” on post pages
   - **Bookmarks** — “N saves” on post pages
   - **Show mine only** — when on, keep counts on your own posts; still hide them on everyone else’s

Likes / Reposts / Bookmarks are **on** (hidden) by default. **Show mine only** is **off** by default.

## Notes

- Relies on Bluesky’s `data-testid` attributes (`likeCount`, `repostCount`, `bookmarkCount-expanded`, etc.).
- **Show mine only** reads the signed-in account from `localStorage` `BSKY_STORAGE` and from the shell Profile link next to Settings (`/profile/{handle}`, same as `makeProfileLink`). Own posts match `feedItem-by-{handle}` / `postThreadItem-by-{handle}`. No app password or API access.
- Only `storage` + content scripts on `bsky.app`.

## Changelog

- **1.1.3** — Detect the signed-in handle from the nav Profile link (desktop icon, not avatar) and match `feedItem-by-{handle}` so own counts show again.
- **1.1.2** — Fix Show mine only breaking hide: while on, hide all counts first (pending), then show only on `.bsky-filter-own-post` via `inline-block` (not `revert`).
- **1.1.1** — Reliable self detection via `BSKY_STORAGE` + locale-safe shell avatar fallback.
- **1.1.0** — Add Show mine only toggle.
- **1.0.0** — Hide likes / reposts / bookmarks with independent toggles.
