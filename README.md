# Bsky Filter

Chrome extension that hides **like**, **repost**, and **bookmark** counts on [bsky.app](https://bsky.app). Buttons stay usable; only the numbers (and expanded post stats) are hidden. Each type has its own toggle.

## Setup

1. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select this folder.
2. Open [bsky.app](https://bsky.app) and click the extension icon to toggle:
   - **Likes** — feed counts + “N likes” on post pages
   - **Reposts** — feed counts + “N reposts” / “N quotes” on post pages
   - **Bookmarks** — “N saves” on post pages

All three are **on** (hidden) by default.

## Notes

- Relies on Bluesky’s `data-testid` attributes (`likeCount`, `repostCount`, `bookmarkCount-expanded`, etc.).
- No account access; only `storage` + content scripts on `bsky.app`.
