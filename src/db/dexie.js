import Dexie from 'dexie';

export const db = new Dexie('chapterKeeper');

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

export const bookmarksTable = db.bookmarks;
export const librariesTable = db.libraries;
