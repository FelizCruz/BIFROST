import Dexie from 'dexie';

export const db = new Dexie('chapterKeeper');

const createSyncId = () => crypto.randomUUID();

db.version(1).stores({
  bookmarks: '++id,title,category,currentChapter,updatedAt,createdAt'
});

db.version(2)
  .stores({
    bookmarks:
      '++id,title,category,libraryId,currentChapter,reminderCadence,updatedAt,createdAt',
    libraries: '++id,name,createdAt,updatedAt'
  })
  .upgrade(async (transaction) => {
    const existingLibraries = await transaction.table('libraries').toArray();
    let defaultLibraryId = existingLibraries[0]?.id;

    if (!defaultLibraryId) {
      defaultLibraryId = await transaction.table('libraries').add({
        name: 'Light Novels',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await transaction
      .table('bookmarks')
      .toCollection()
      .modify((bookmark) => {
        if (!bookmark.libraryId) {
          bookmark.libraryId = defaultLibraryId;
        }

        if (!bookmark.reminderCadence) {
          bookmark.reminderCadence = 'none';
        }
      });
  });

db.version(3)
  .stores({
    bookmarks:
      '++id,remoteId,title,category,libraryId,currentChapter,reminderCadence,syncStatus,updatedAt,createdAt,deletedAt',
    libraries: '++id,remoteId,name,syncStatus,createdAt,updatedAt,deletedAt'
  })
  .upgrade(async (transaction) => {
    await transaction
      .table('libraries')
      .toCollection()
      .modify((library) => {
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

    await transaction
      .table('bookmarks')
      .toCollection()
      .modify((bookmark) => {
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

export const bookmarksTable = db.bookmarks;
export const librariesTable = db.libraries;
