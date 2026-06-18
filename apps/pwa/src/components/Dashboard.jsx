import { useMemo, useState } from 'react';
import BookmarkCard from './BookmarkCard.jsx';

function Dashboard({
  bookmarks,
  libraries,
  activeLibraryId,
  isLoading,
  onActiveLibraryChange,
  onAddLibrary,
  onAdd,
  onEdit,
  onOpen,
  onChapterChange
}) {
  const [query, setQuery] = useState('');
  const [newLibraryName, setNewLibraryName] = useState('');
  const [isCreatingLibrary, setIsCreatingLibrary] = useState(false);

  const activeBookmarks = useMemo(() => {
    if (activeLibraryId === 'all') {
      return bookmarks;
    }

    return bookmarks.filter((bookmark) => bookmark.libraryId === activeLibraryId);
  }, [activeLibraryId, bookmarks]);

  const filteredBookmarks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return activeBookmarks;
    }

    return activeBookmarks.filter((bookmark) => {
      const title = bookmark.title.toLowerCase();
      const category = bookmark.category.toLowerCase();
      return title.includes(normalizedQuery) || category.includes(normalizedQuery);
    });
  }, [activeBookmarks, query]);

  const handleCreateLibrary = async (event) => {
    event.preventDefault();

    if (isCreatingLibrary) {
      return;
    }

    setIsCreatingLibrary(true);

    try {
      const id = await onAddLibrary(newLibraryName);
      if (id) {
        setNewLibraryName('');
      }
    } finally {
      setIsCreatingLibrary(false);
    }
  };

  return (
    <section className="dashboard" aria-label="Bookmarks dashboard">
      <div className="library-panel" aria-label="Libraries">
        <div className="library-tabs">
          <button
            className={activeLibraryId === 'all' ? 'library-tab active' : 'library-tab'}
            type="button"
            onClick={() => onActiveLibraryChange('all')}
          >
            All
            <span>{bookmarks.length}</span>
          </button>
          {libraries.map((library) => {
            const count = bookmarks.filter(
              (bookmark) => bookmark.libraryId === library.id
            ).length;

            return (
              <button
                key={library.id}
                className={
                  activeLibraryId === library.id ? 'library-tab active' : 'library-tab'
                }
                type="button"
                onClick={() => onActiveLibraryChange(library.id)}
              >
                {library.name}
                <span>{count}</span>
              </button>
            );
          })}
        </div>

        <form className="library-create" onSubmit={handleCreateLibrary}>
          <label className="sr-only" htmlFor="library-name">
            New library name
          </label>
          <input
            id="library-name"
            type="text"
            value={newLibraryName}
            onChange={(event) => setNewLibraryName(event.target.value)}
            placeholder="New library"
          />
          <button type="submit" disabled={isCreatingLibrary}>
            Create
          </button>
        </form>
      </div>

      <div className="toolbar">
        <label className="search-field" htmlFor="bookmark-search">
          <span className="sr-only">Search title or category</span>
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M10.8 18.1a7.3 7.3 0 1 1 5.2-2.2l4 4-1.5 1.5-4-4a7.2 7.2 0 0 1-3.7.7Zm0-2.1a5.2 5.2 0 1 0 0-10.4 5.2 5.2 0 0 0 0 10.4Z" />
          </svg>
          <input
            id="bookmark-search"
            type="search"
            placeholder="Search title or category"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      {isLoading ? (
        <p className="empty-state">Loading your saved chapters...</p>
      ) : filteredBookmarks.length > 0 ? (
        <div className="bookmark-grid">
          {filteredBookmarks.map((bookmark) => (
            <BookmarkCard
              key={bookmark.id}
              bookmark={bookmark}
              onEdit={onEdit}
              onOpen={onOpen}
              onChapterChange={onChapterChange}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>{activeBookmarks.length ? 'No matches found' : 'No bookmarks yet'}</h2>
          <p>
            {activeBookmarks.length
              ? 'Try another title or category.'
              : 'Save your first web novel, fanfic, manga, or documentation link in this library.'}
          </p>
          {!activeBookmarks.length && (
            <button className="primary-action" type="button" onClick={onAdd}>
              Add bookmark
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default Dashboard;
