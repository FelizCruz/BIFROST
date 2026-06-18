# BIFROST

BIFROST is a mobile-first PWA for tracking serialized online content such as web novels, manga, fanfics, and documentation.

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

## Data

BIFROST is local-first. Bookmarks, libraries, covers, and reminders are stored
in the browser with IndexedDB/Dexie. Use settings export/import to move data
between devices or keep manual backups.

The previous optional Supabase sync implementation is preserved on the
`supabase-sync` branch.
