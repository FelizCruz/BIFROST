# BIFROST

BIFROST is a mobile-first PWA for tracking serialized online content such as web novels, manga, fanfics, and documentation.

## Features

- Save URL templates with `{chapter}` replacement.
- Track current chapter with immediate +/- updates.
- Organize bookmarks into libraries such as Light Novels or Manga.
- Upload local cover images for bookmarks.
- Set optional in-app reminders.
- Export and import local JSON backups.
- Optional Supabase sync across devices.
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

## Optional Sync

BIFROST works without an account. Supabase is only required for users who want
cross-device sync.

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local`.
4. Fill in:

```text
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

5. Restart the dev server.

For Vercel, add the same environment variables to the project settings. The
sync UI will stay in local-only mode until these variables are configured.
