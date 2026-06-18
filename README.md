# BIFROST

BIFROST is a mobile-first PWA for tracking serialized online content such as web novels, manga, fanfics, and documentation.

## Repository Layout

```text
apps/pwa/              React/Vite PWA
extensions/browser/    Manifest V3 browser extension
```

## Features

- Save URL templates with `{chapter}` replacement.
- Track current chapter with immediate +/- updates.
- Organize bookmarks into libraries such as Light Novels or Manga.
- Upload local cover images for bookmarks.
- Set optional in-app reminders.
- Export and import local JSON backups.
- Offline-ready PWA shell after the first visit.

## Run Locally

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:5173/`.

## Build

```powershell
npm.cmd run build
```

## Browser Extension

The extension lets a user capture the current browser tab with minimal friction.
It opens BIFROST with the Add Bookmark modal prefilled, so bookmark data still
stays in the PWA's local IndexedDB storage.

To test locally:

1. Open Chrome or Edge extensions.
2. Enable developer mode.
3. Choose "Load unpacked".
4. Select `extensions/browser`.

## Data

BIFROST is local-first. Bookmarks, libraries, covers, and reminders are stored
in the browser with IndexedDB/Dexie. Use settings export/import to move data
between devices or keep manual backups.

The previous optional Supabase sync implementation is preserved on the
`supabase-sync` branch.
