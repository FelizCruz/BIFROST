import { useEffect, useRef, useState } from 'react';

function BookmarkCard({ bookmark, onEdit, onOpen, onChapterChange }) {
  const [pendingAction, setPendingAction] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const previousChapter = useRef(bookmark.currentChapter);

  useEffect(() => {
    if (previousChapter.current !== bookmark.currentChapter) {
      setIsAnimating(true);
      previousChapter.current = bookmark.currentChapter;

      const timeoutId = window.setTimeout(() => {
        setIsAnimating(false);
      }, 380);

      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [bookmark.currentChapter]);

  const stepChapter = async (delta) => {
    if (pendingAction) {
      return;
    }

    const nextChapter = Math.max(1, bookmark.currentChapter + delta);

    if (nextChapter === bookmark.currentChapter) {
      return;
    }

    setPendingAction(delta > 0 ? 'increment' : 'decrement');

    try {
      await onChapterChange(bookmark, nextChapter);
    } finally {
      setPendingAction(null);
    }
  };

  const totalLabel = bookmark.totalChapters ? ` / ${bookmark.totalChapters}` : '';
  const canDecrement = bookmark.currentChapter > 1 && !pendingAction;

  return (
    <article className={`bookmark-card${isAnimating ? ' chapter-bump' : ''}`}>
      <div className={`cover-shell${bookmark.coverImage ? ' has-cover' : ''}`}>
        {bookmark.coverImage ? (
          <img src={bookmark.coverImage} alt={`${bookmark.title} cover`} />
        ) : (
          <div className="cover-placeholder" aria-hidden="true">
            <span>{bookmark.title.slice(0, 1).toUpperCase()}</span>
          </div>
        )}
      </div>

      <div className="card-header">
        <div className="card-title-wrap">
          <h2>{bookmark.title}</h2>
          <p className="url-preview">{bookmark.baseUrl}</p>
        </div>
        <span className="category-badge">{bookmark.category}</span>
      </div>

      <div className="chapter-display" aria-live="polite">
        <span className="chapter-label">Current chapter</span>
        <strong>
          {bookmark.currentChapter}
          <span>{totalLabel}</span>
        </strong>
      </div>

      <div className="card-actions" aria-label={`${bookmark.title} actions`}>
        <button
          className="icon-action"
          type="button"
          onClick={() => stepChapter(-1)}
          disabled={!canDecrement}
          aria-label={`Decrease ${bookmark.title} chapter`}
        >
          {pendingAction === 'decrement' ? '...' : '-'}
        </button>
        <button
          className="open-action"
          type="button"
          onClick={() => onOpen(bookmark)}
        >
          Open
        </button>
        <button
          className="icon-action"
          type="button"
          onClick={() => stepChapter(1)}
          disabled={Boolean(pendingAction)}
          aria-label={`Increase ${bookmark.title} chapter`}
        >
          {pendingAction === 'increment' ? '...' : '+'}
        </button>
        <button
          className="secondary-action"
          type="button"
          onClick={() => onEdit(bookmark)}
        >
          Edit
        </button>
      </div>
    </article>
  );
}

export default BookmarkCard;
