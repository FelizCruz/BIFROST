import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db } from './db/dexie.js';
import Dashboard from './components/Dashboard.jsx';
import AddEditModal from './components/AddEditModal.jsx';
import Settings from './components/Settings.jsx';
import Notifications from './components/Notifications.jsx';
import Toast from './components/Toast.jsx';

const sortBookmarks = (items) =>
  [...items].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

const sortLibraries = (items) =>
  [...items].sort((a, b) => a.name.localeCompare(b.name));

const DEFAULT_LIBRARY_NAME = 'Light Novels';
const CHAPTER_PATTERNS = [
  /((?:chapter|ch)[\s._/-]*)(\d+)/i,
  /([?&](?:chapter|ch)=)(\d+)/i,
  /(\/)(\d+)(?:\/?$)/
];
const initialLibrary = {
  id: 1,
  name: DEFAULT_LIBRARY_NAME,
  createdAt: new Date(),
  updatedAt: new Date()
};

const getFallbackTitle = (url) => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.replace(/^www\./, '') || 'Untitled bookmark';
  } catch {
    return 'Untitled bookmark';
  }
};

const getChapterTemplate = (url) => {
  for (const pattern of CHAPTER_PATTERNS) {
    const match = url.match(pattern);

    if (match) {
      return {
        baseUrl: url.replace(pattern, `${match[1]}{chapter}`),
        currentChapter: Number(match[2])
      };
    }
  }

  return {
    baseUrl: url,
    currentChapter: 1
  };
};

const getAddRequestFromUrl = (libraries) => {
  const params = new URLSearchParams(window.location.search);

  if (params.get('add') !== '1') {
    return null;
  }

  const rawUrl = (params.get('baseUrl') || params.get('url') || '').trim();
  const title = (params.get('title') || '').trim() || getFallbackTitle(rawUrl);
  const shouldInferTemplate = params.get('template') === 'auto';
  const template = shouldInferTemplate
    ? getChapterTemplate(rawUrl)
    : { baseUrl: rawUrl, currentChapter: 1 };

  if (!rawUrl) {
    return null;
  }

  const currentChapterParam = Number(params.get('currentChapter'));
  const currentChapter = Number.isInteger(currentChapterParam) && currentChapterParam >= 1
    ? currentChapterParam
    : template.currentChapter;

  return {
    title,
    baseUrl: template.baseUrl,
    currentChapter: String(Math.max(1, currentChapter)),
    category: (params.get('category') || 'Reading').trim() || 'Reading',
    libraryId: String(libraries[0]?.id || ''),
    totalChapters: '',
    coverImage: null,
    reminderCadence: 'none',
    reminderCreatedAt: null,
    reminderLastDismissedAt: null
  };
};

const ensureDefaultLibrary = async () => {
  const existing = await db.libraries.toArray();

  if (existing.length) {
    return sortLibraries(existing);
  }

  const now = new Date();
  const id = await db.libraries.add({
    name: DEFAULT_LIBRARY_NAME,
    createdAt: now,
    updatedAt: now
  });

  return [{
    id,
    name: DEFAULT_LIBRARY_NAME,
    createdAt: now,
    updatedAt: now
  }];
};

function App() {
  const [bookmarks, setBookmarks] = useState([]);
  const [libraries, setLibraries] = useState([initialLibrary]);
  const [activeLibraryId, setActiveLibraryId] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [modalBookmark, setModalBookmark] = useState(null);
  const [modalInitialValues, setModalInitialValues] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const hasConsumedAddRequestRef = useRef(false);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ id: crypto.randomUUID(), message, type });
  }, []);

  const loadBookmarks = useCallback(async () => {
    const records = await db.bookmarks.toArray();
    setBookmarks(sortBookmarks(records));
  }, []);

  const loadLibraries = useCallback(async () => {
    const records = await ensureDefaultLibrary();
    setLibraries(sortLibraries(records));
    return records;
  }, []);

  useEffect(() => {
    let isMounted = true;

    db.open()
      .then(async () => {
        const [libraryRecords, bookmarkRecords] = await Promise.all([
          ensureDefaultLibrary(),
          db.bookmarks.toArray()
        ]);
        if (isMounted) {
          setLibraries(sortLibraries(libraryRecords));
          setBookmarks(sortBookmarks(bookmarkRecords));
        }
      })
      .catch((error) => {
        console.error(error);
        showToast('Could not open local bookmark storage.', 'error');
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [showToast]);

  useEffect(() => {
    if (hasConsumedAddRequestRef.current || !libraries.length) {
      return;
    }

    const addRequest = getAddRequestFromUrl(libraries);

    if (!addRequest) {
      return;
    }

    hasConsumedAddRequestRef.current = true;
    setModalBookmark(null);
    setModalInitialValues(addRequest);
    setIsModalOpen(true);
    window.history.replaceState({}, document.title, window.location.pathname);
  }, [libraries]);

  const openAddModal = () => {
    setModalBookmark(null);
    setModalInitialValues(null);
    setIsModalOpen(true);
  };

  const openEditModal = (bookmark) => {
    setModalBookmark(bookmark);
    setModalInitialValues(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalBookmark(null);
    setModalInitialValues(null);
  };

  const handleSaveBookmark = async (formValues) => {
    const now = new Date();
    const payload = {
      title: formValues.title.trim(),
      baseUrl: formValues.baseUrl.trim(),
      currentChapter: Math.max(1, Number(formValues.currentChapter)),
      totalChapters: formValues.totalChapters,
      category: formValues.category.trim() || 'Uncategorized',
      libraryId: Number(formValues.libraryId),
      coverImage: formValues.coverImage || null,
      reminderCadence: formValues.reminderCadence || 'none',
      reminderCreatedAt:
        formValues.reminderCadence && formValues.reminderCadence !== 'none'
          ? formValues.reminderCreatedAt || now
          : null,
      reminderLastDismissedAt: formValues.reminderLastDismissedAt || null,
      updatedAt: now
    };

    if (modalBookmark?.id) {
      await db.bookmarks.update(modalBookmark.id, payload);
      setBookmarks((current) =>
        sortBookmarks(
          current.map((item) =>
            item.id === modalBookmark.id ? { ...item, ...payload } : item
          )
        )
      );
      showToast('Bookmark updated.', 'success');
    } else {
      const created = {
        ...payload,
        createdAt: now
      };
      const id = await db.bookmarks.add(created);
      setBookmarks((current) => sortBookmarks([{ ...created, id }, ...current]));
      showToast('Bookmark added.', 'success');
    }

    closeModal();
  };

  const handleAddLibrary = async (name) => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      showToast('Library name is required.', 'error');
      return null;
    }

    const duplicate = libraries.find(
      (library) => library.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicate) {
      setActiveLibraryId(duplicate.id);
      showToast('That library already exists.', 'info');
      return duplicate.id;
    }

    const now = new Date();
    const library = {
      name: trimmedName,
      createdAt: now,
      updatedAt: now
    };
    const id = await db.libraries.add(library);
    const savedLibrary = { ...library, id };

    setLibraries((current) => sortLibraries([...current, savedLibrary]));
    setActiveLibraryId(id);
    showToast('Library created.', 'success');
    return id;
  };

  const handleChapterChange = async (bookmark, nextChapter) => {
    const currentSnapshot = bookmarks;
    const safeChapter = Math.max(1, nextChapter);
    const updatedAt = new Date();

    setBookmarks((current) =>
      sortBookmarks(
        current.map((item) =>
          item.id === bookmark.id
            ? {
                ...item,
                currentChapter: safeChapter,
                updatedAt
              }
            : item
        )
      )
    );

    try {
      await db.bookmarks.update(bookmark.id, {
        currentChapter: safeChapter,
        updatedAt
      });
    } catch (error) {
      console.error(error);
      setBookmarks(currentSnapshot);
      showToast('Chapter update failed. Your previous value was restored.', 'error');
      throw error;
    }
  };

  const handleOpenBookmark = (bookmark) => {
    const hasChapterToken = bookmark.baseUrl.includes('{chapter}');
    const url = hasChapterToken
      ? bookmark.baseUrl.replaceAll('{chapter}', String(bookmark.currentChapter))
      : bookmark.baseUrl;

    if (!hasChapterToken) {
      showToast('URL has no {chapter}; opening raw URL.', 'warning');
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDismissReminder = async (bookmarkId) => {
    const reminderLastDismissedAt = new Date();
    await db.bookmarks.update(bookmarkId, {
      reminderLastDismissedAt
    });
    setBookmarks((current) =>
      current.map((bookmark) =>
        bookmark.id === bookmarkId
          ? { ...bookmark, reminderLastDismissedAt }
          : bookmark
      )
    );
    showToast('Reminder dismissed.', 'success');
  };

  const handleImportReplace = async ({ libraries: importedLibraries, bookmarks: importedBookmarks }) => {
    await db.transaction('rw', db.bookmarks, db.libraries, async () => {
      await db.bookmarks.clear();
      await db.libraries.clear();
      await db.libraries.bulkAdd(importedLibraries);
      await db.bookmarks.bulkAdd(importedBookmarks);
    });

    const [libraryRecords] = await Promise.all([loadLibraries(), loadBookmarks()]);
    setActiveLibraryId(libraryRecords[0]?.id || 'all');
    showToast(`Imported ${importedBookmarks.length} bookmark${importedBookmarks.length === 1 ? '' : 's'}.`, 'success');
  };

  const bookmarkCountLabel = useMemo(() => {
    return `${bookmarks.length} saved ${bookmarks.length === 1 ? 'bookmark' : 'bookmarks'}`;
  }, [bookmarks.length]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>BIFROST</h1>
          <p className="app-subtitle">{bookmarkCountLabel}</p>
        </div>
        <Settings
          bookmarks={bookmarks}
          libraries={libraries}
          onImportReplace={handleImportReplace}
          onToast={showToast}
        />
        <Notifications
          bookmarks={bookmarks}
          libraries={libraries}
          onDismissReminder={handleDismissReminder}
        />
      </header>

      <main>
        <Dashboard
          bookmarks={bookmarks}
          libraries={libraries}
          activeLibraryId={activeLibraryId}
          isLoading={isLoading}
          onActiveLibraryChange={setActiveLibraryId}
          onAddLibrary={handleAddLibrary}
          onAdd={openAddModal}
          onEdit={openEditModal}
          onOpen={handleOpenBookmark}
          onChapterChange={handleChapterChange}
        />
      </main>

      <button className="floating-add" type="button" onClick={openAddModal}>
        <span aria-hidden="true">+</span>
        Add
      </button>

      <AddEditModal
        isOpen={isModalOpen}
        bookmark={modalBookmark}
        libraries={libraries}
        activeLibraryId={activeLibraryId}
        initialValues={modalInitialValues}
        onClose={closeModal}
        onSave={handleSaveBookmark}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

export default App;
