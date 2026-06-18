import { db } from '../db/dexie.js';
import { supabase } from './supabaseClient.js';

const COVER_BUCKET = 'covers';

const isoOrNull = (value) => (value ? new Date(value).toISOString() : null);
const dateOrNull = (value) => (value ? new Date(value) : null);
const createSyncId = () => crypto.randomUUID();

const localDateValue = (value) => {
  const date = value ? new Date(value) : new Date(0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const ensureLocalSyncFields = async () => {
  await db.transaction('rw', db.libraries, db.bookmarks, async () => {
    await db.libraries.toCollection().modify((library) => {
      if (!library.remoteId) {
        library.remoteId = createSyncId();
      }
      if (!library.syncStatus) {
        library.syncStatus = 'pending';
      }
      if (library.deletedAt === undefined) {
        library.deletedAt = null;
      }
    });

    await db.bookmarks.toCollection().modify((bookmark) => {
      if (!bookmark.remoteId) {
        bookmark.remoteId = createSyncId();
      }
      if (!bookmark.syncStatus) {
        bookmark.syncStatus = 'pending';
      }
      if (bookmark.lastSyncedAt === undefined) {
        bookmark.lastSyncedAt = null;
      }
      if (bookmark.deletedAt === undefined) {
        bookmark.deletedAt = null;
      }
    });
  });
};

const dataUrlToBlob = async (dataUrl) => {
  const response = await fetch(dataUrl);
  return response.blob();
};

const extensionForMime = (mimeType) => {
  if (mimeType === 'image/png') {
    return 'png';
  }
  if (mimeType === 'image/webp') {
    return 'webp';
  }
  if (mimeType === 'image/gif') {
    return 'gif';
  }
  return 'jpg';
};

const uploadCoverIfNeeded = async (bookmark, userId) => {
  if (!bookmark.coverImage || !bookmark.coverImage.startsWith('data:image/')) {
    return {
      coverImage: bookmark.coverImage || null,
      coverPath: bookmark.coverPath || null
    };
  }

  const blob = await dataUrlToBlob(bookmark.coverImage);
  const extension = extensionForMime(blob.type);
  const coverPath =
    bookmark.coverPath ||
    `${userId}/${bookmark.remoteId}-${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from(COVER_BUCKET)
    .upload(coverPath, blob, {
      contentType: blob.type,
      upsert: true
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(COVER_BUCKET).getPublicUrl(coverPath);

  return {
    coverImage: data.publicUrl,
    coverPath
  };
};

const toRemoteLibrary = (library, userId) => ({
  id: library.remoteId,
  user_id: userId,
  name: library.name,
  created_at: isoOrNull(library.createdAt) || new Date().toISOString(),
  updated_at: isoOrNull(library.updatedAt) || new Date().toISOString(),
  deleted_at: isoOrNull(library.deletedAt)
});

const toRemoteBookmark = async (bookmark, libraryRemoteId, userId) => {
  const cover = await uploadCoverIfNeeded(bookmark, userId);

  return {
    id: bookmark.remoteId,
    user_id: userId,
    library_id: libraryRemoteId,
    title: bookmark.title,
    base_url: bookmark.baseUrl,
    current_chapter: bookmark.currentChapter,
    total_chapters: bookmark.totalChapters ?? null,
    category: bookmark.category,
    cover_image: cover.coverImage,
    cover_path: cover.coverPath,
    reminder_cadence: bookmark.reminderCadence || 'none',
    reminder_created_at: isoOrNull(bookmark.reminderCreatedAt),
    reminder_last_dismissed_at: isoOrNull(bookmark.reminderLastDismissedAt),
    created_at: isoOrNull(bookmark.createdAt) || new Date().toISOString(),
    updated_at: isoOrNull(bookmark.updatedAt) || new Date().toISOString(),
    deleted_at: isoOrNull(bookmark.deletedAt)
  };
};

const fromRemoteLibrary = (row) => ({
  remoteId: row.id,
  name: row.name,
  createdAt: dateOrNull(row.created_at) || new Date(),
  updatedAt: dateOrNull(row.updated_at) || new Date(),
  deletedAt: dateOrNull(row.deleted_at),
  syncStatus: 'synced',
  lastSyncedAt: new Date()
});

const fromRemoteBookmark = (row, localLibraryId) => ({
  remoteId: row.id,
  libraryId: localLibraryId,
  title: row.title,
  baseUrl: row.base_url,
  currentChapter: row.current_chapter,
  totalChapters: row.total_chapters,
  category: row.category,
  coverImage: row.cover_image,
  coverPath: row.cover_path,
  reminderCadence: row.reminder_cadence || 'none',
  reminderCreatedAt: dateOrNull(row.reminder_created_at),
  reminderLastDismissedAt: dateOrNull(row.reminder_last_dismissed_at),
  createdAt: dateOrNull(row.created_at) || new Date(),
  updatedAt: dateOrNull(row.updated_at) || new Date(),
  deletedAt: dateOrNull(row.deleted_at),
  syncStatus: 'synced',
  lastSyncedAt: new Date()
});

export const markRecordPending = (record) => ({
  ...record,
  syncStatus: 'pending',
  lastSyncedAt: null
});

export const performSync = async (user) => {
  if (!supabase || !user) {
    return { status: 'local-only', syncedAt: null };
  }

  if (!navigator.onLine) {
    return { status: 'offline-pending', syncedAt: null };
  }

  await ensureLocalSyncFields();

  const [localLibraries, localBookmarks] = await Promise.all([
    db.libraries.toArray(),
    db.bookmarks.toArray()
  ]);

  const libraryRemoteByLocalId = new Map(
    localLibraries.map((library) => [library.id, library.remoteId])
  );

  const [{ data: existingLibraries, error: existingLibrariesError }, { data: existingBookmarks, error: existingBookmarksError }] =
    await Promise.all([
      supabase.from('libraries').select('*'),
      supabase.from('bookmarks').select('*')
    ]);

  if (existingLibrariesError) {
    throw existingLibrariesError;
  }
  if (existingBookmarksError) {
    throw existingBookmarksError;
  }

  const existingLibraryById = new Map(
    (existingLibraries || []).map((library) => [library.id, library])
  );
  const existingBookmarkById = new Map(
    (existingBookmarks || []).map((bookmark) => [bookmark.id, bookmark])
  );

  const remoteLibraries = localLibraries.map((library) =>
    toRemoteLibrary(library, user.id)
  ).filter((library) => {
    const existing = existingLibraryById.get(library.id);
    return !existing || localDateValue(library.updated_at) >= localDateValue(existing.updated_at);
  });

  if (remoteLibraries.length) {
    const { error } = await supabase
      .from('libraries')
      .upsert(remoteLibraries, { onConflict: 'id' });

    if (error) {
      throw error;
    }
  }

  const remoteBookmarks = [];
  for (const bookmark of localBookmarks) {
    const libraryRemoteId = libraryRemoteByLocalId.get(bookmark.libraryId);
    if (!libraryRemoteId) {
      continue;
    }
    const remoteBookmark = await toRemoteBookmark(bookmark, libraryRemoteId, user.id);
    const existing = existingBookmarkById.get(remoteBookmark.id);

    if (
      !existing ||
      localDateValue(remoteBookmark.updated_at) >= localDateValue(existing.updated_at)
    ) {
      remoteBookmarks.push(remoteBookmark);
    }
  }

  if (remoteBookmarks.length) {
    const { error } = await supabase
      .from('bookmarks')
      .upsert(remoteBookmarks, { onConflict: 'id' });

    if (error) {
      throw error;
    }
  }

  const [{ data: cloudLibraries, error: librariesError }, { data: cloudBookmarks, error: bookmarksError }] =
    await Promise.all([
      supabase.from('libraries').select('*').order('updated_at', { ascending: true }),
      supabase.from('bookmarks').select('*').order('updated_at', { ascending: true })
    ]);

  if (librariesError) {
    throw librariesError;
  }
  if (bookmarksError) {
    throw bookmarksError;
  }

  const syncedAt = new Date();

  await db.transaction('rw', db.libraries, db.bookmarks, async () => {
    const freshLibraries = await db.libraries.toArray();
    const freshBookmarks = await db.bookmarks.toArray();
    const localLibraryByRemoteId = new Map(
      freshLibraries.map((library) => [library.remoteId, library])
    );

    for (const row of cloudLibraries || []) {
      const local = localLibraryByRemoteId.get(row.id);
      const remoteLibrary = fromRemoteLibrary(row);

      if (!local) {
        const id = await db.libraries.add(remoteLibrary);
        localLibraryByRemoteId.set(row.id, { ...remoteLibrary, id });
        continue;
      }

      if (localDateValue(row.updated_at) >= localDateValue(local.updatedAt)) {
        await db.libraries.update(local.id, remoteLibrary);
      } else {
        await db.libraries.update(local.id, {
          syncStatus: 'synced',
          lastSyncedAt: syncedAt
        });
      }
    }

    const updatedLibraries = await db.libraries.toArray();
    const libraryIdByRemoteId = new Map(
      updatedLibraries.map((library) => [library.remoteId, library.id])
    );
    const localBookmarkByRemoteId = new Map(
      freshBookmarks.map((bookmark) => [bookmark.remoteId, bookmark])
    );

    for (const row of cloudBookmarks || []) {
      const localLibraryId = libraryIdByRemoteId.get(row.library_id);
      if (!localLibraryId) {
        continue;
      }

      const local = localBookmarkByRemoteId.get(row.id);
      const remoteBookmark = fromRemoteBookmark(row, localLibraryId);

      if (!local) {
        await db.bookmarks.add(remoteBookmark);
        continue;
      }

      if (localDateValue(row.updated_at) >= localDateValue(local.updatedAt)) {
        await db.bookmarks.update(local.id, remoteBookmark);
      } else {
        await db.bookmarks.update(local.id, {
          syncStatus: 'synced',
          lastSyncedAt: syncedAt
        });
      }
    }
  });

  return { status: 'synced', syncedAt };
};
