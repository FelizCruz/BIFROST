import { useRef, useState } from 'react';

const serializeBookmark = (bookmark) => ({
  id: bookmark.id,
  title: bookmark.title,
  baseUrl: bookmark.baseUrl,
  currentChapter: bookmark.currentChapter,
  totalChapters: bookmark.totalChapters ?? null,
  category: bookmark.category,
  libraryId: bookmark.libraryId,
  coverImage: bookmark.coverImage || null,
  reminderCadence: bookmark.reminderCadence || 'none',
  reminderCreatedAt: bookmark.reminderCreatedAt
    ? new Date(bookmark.reminderCreatedAt).toISOString()
    : null,
  reminderLastDismissedAt: bookmark.reminderLastDismissedAt
    ? new Date(bookmark.reminderLastDismissedAt).toISOString()
    : null,
  createdAt: new Date(bookmark.createdAt).toISOString(),
  updatedAt: new Date(bookmark.updatedAt).toISOString()
});

const serializeLibrary = (library) => ({
  id: library.id,
  name: library.name,
  createdAt: new Date(library.createdAt).toISOString(),
  updatedAt: new Date(library.updatedAt).toISOString()
});

const parseDate = (value, fieldName, index) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Bookmark ${index + 1} has an invalid ${fieldName}.`);
  }

  return date;
};

const normalizeImportedData = (payload) => {
  const sourceLibraries = Array.isArray(payload)
    ? [{ id: 1, name: 'Light Novels', createdAt: new Date(), updatedAt: new Date() }]
    : payload?.libraries;
  const sourceBookmarks = Array.isArray(payload) ? payload : payload?.bookmarks;

  if (!Array.isArray(sourceLibraries) || !Array.isArray(sourceBookmarks)) {
    throw new Error('Import file must contain bookmarks and libraries.');
  }

  const seenLibraryIds = new Set();
  const seenLibraryNames = new Set();
  const libraries = sourceLibraries.map((library, index) => {
    if (!library || typeof library !== 'object' || Array.isArray(library)) {
      throw new Error(`Library ${index + 1} is not a valid object.`);
    }

    const id = Number(library.id);
    const name = typeof library.name === 'string' ? library.name.trim() : '';

    if (!Number.isInteger(id) || id < 1 || !name) {
      throw new Error(`Library ${index + 1} has an invalid id or name.`);
    }

    const normalizedName = name.toLowerCase();
    if (seenLibraryIds.has(id) || seenLibraryNames.has(normalizedName)) {
      throw new Error(`Library ${index + 1} is duplicated.`);
    }

    seenLibraryIds.add(id);
    seenLibraryNames.add(normalizedName);

    return {
      id,
      name,
      createdAt: parseDate(library.createdAt, 'createdAt', index),
      updatedAt: parseDate(library.updatedAt, 'updatedAt', index)
    };
  });

  if (!libraries.length) {
    throw new Error('Import file must contain at least one library.');
  }

  const seenIds = new Set();

  const bookmarks = sourceBookmarks.map((record, index) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      throw new Error(`Bookmark ${index + 1} is not a valid object.`);
    }

    const title = typeof record.title === 'string' ? record.title.trim() : '';
    const baseUrl = typeof record.baseUrl === 'string' ? record.baseUrl.trim() : '';
    const category =
      typeof record.category === 'string' ? record.category.trim() : '';
    const currentChapter = Number(record.currentChapter);
    const libraryId = record.libraryId === undefined ? libraries[0].id : Number(record.libraryId);
    const totalChapters =
      record.totalChapters === null ||
      record.totalChapters === undefined ||
      record.totalChapters === ''
        ? null
        : Number(record.totalChapters);
    const coverImage =
      record.coverImage === null || record.coverImage === undefined || record.coverImage === ''
        ? null
        : record.coverImage;
    const reminderCadence = record.reminderCadence || 'none';
    const reminderCreatedAt =
      record.reminderCreatedAt === null ||
      record.reminderCreatedAt === undefined ||
      record.reminderCreatedAt === ''
        ? null
        : parseDate(record.reminderCreatedAt, 'reminderCreatedAt', index);
    const reminderLastDismissedAt =
      record.reminderLastDismissedAt === null ||
      record.reminderLastDismissedAt === undefined ||
      record.reminderLastDismissedAt === ''
        ? null
        : parseDate(record.reminderLastDismissedAt, 'reminderLastDismissedAt', index);

    if (!title || !baseUrl || !category) {
      throw new Error(`Bookmark ${index + 1} is missing title, baseUrl, or category.`);
    }

    if (!Number.isInteger(currentChapter) || currentChapter < 1) {
      throw new Error(`Bookmark ${index + 1} has an invalid currentChapter.`);
    }

    if (!seenLibraryIds.has(libraryId)) {
      throw new Error(`Bookmark ${index + 1} references a missing library.`);
    }

    if (
      totalChapters !== null &&
      (!Number.isInteger(totalChapters) || totalChapters < currentChapter)
    ) {
      throw new Error(`Bookmark ${index + 1} has an invalid totalChapters value.`);
    }

    if (
      coverImage !== null &&
      (typeof coverImage !== 'string' || !coverImage.startsWith('data:image/'))
    ) {
      throw new Error(`Bookmark ${index + 1} has an invalid coverImage value.`);
    }

    if (!['none', 'daily', 'weekly', 'monthly'].includes(reminderCadence)) {
      throw new Error(`Bookmark ${index + 1} has an invalid reminder cadence.`);
    }

    const normalized = {
      title,
      baseUrl,
      currentChapter,
      totalChapters,
      category,
      libraryId,
      coverImage,
      reminderCadence,
      reminderCreatedAt,
      reminderLastDismissedAt,
      createdAt: parseDate(record.createdAt, 'createdAt', index),
      updatedAt: parseDate(record.updatedAt, 'updatedAt', index)
    };

    if (record.id !== undefined && record.id !== null && record.id !== '') {
      const id = Number(record.id);
      if (!Number.isInteger(id) || id < 1 || seenIds.has(id)) {
        throw new Error(`Bookmark ${index + 1} has an invalid or duplicate id.`);
      }
      seenIds.add(id);
      normalized.id = id;
    }

    return normalized;
  });

  return { libraries, bookmarks };
};

function Settings({ bookmarks, libraries, onImportReplace, onToast }) {
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef(null);

  const exportBookmarks = () => {
    const data = JSON.stringify(
      {
        app: 'BIFROST',
        version: 2,
        exportedAt: new Date().toISOString(),
        libraries: libraries.map(serializeLibrary),
        bookmarks: bookmarks.map(serializeBookmark)
      },
      null,
      2
    );
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'bifrost-bookmarks.json';
    link.click();
    URL.revokeObjectURL(url);
    setIsOpen(false);
    onToast('Bookmarks exported.', 'success');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event) => {
    const [file] = event.target.files;
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const normalized = normalizeImportedData(parsed);
      const confirmed = window.confirm(
        `Import ${normalized.bookmarks.length} bookmark${normalized.bookmarks.length === 1 ? '' : 's'} across ${normalized.libraries.length} librar${normalized.libraries.length === 1 ? 'y' : 'ies'} and replace all existing data?`
      );

      if (!confirmed) {
        onToast('Import cancelled.', 'info');
        return;
      }

      await onImportReplace(normalized);
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      onToast(error.message || 'Invalid import file. Existing bookmarks were not changed.', 'error');
    }
  };

  return (
    <div className="settings">
      <button
        className="settings-button"
        type="button"
        aria-label="Open settings"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2-1.5-2-3.5-2.4 1a8.3 8.3 0 0 0-2.6-1.5L14 2.4h-4l-.4 2.6A8.3 8.3 0 0 0 7 6.5l-2.4-1-2 3.5 2 1.5a9.7 9.7 0 0 0 0 3l-2 1.5 2 3.5 2.4-1a8.3 8.3 0 0 0 2.6 1.5l.4 2.6h4l.4-2.6a8.3 8.3 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z" />
        </svg>
      </button>

      {isOpen && (
        <div className="settings-menu">
          <button type="button" onClick={exportBookmarks}>
            Export JSON
          </button>
          <button type="button" onClick={handleImportClick}>
            Import JSON
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept="application/json,.json"
        onChange={handleImportFile}
      />
    </div>
  );
}

export default Settings;
