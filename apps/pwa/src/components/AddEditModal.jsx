import { useEffect, useMemo, useRef, useState } from 'react';

const emptyForm = {
  title: '',
  baseUrl: '',
  currentChapter: '1',
  totalChapters: '',
  category: 'Reading',
  coverImage: null,
  libraryId: '',
  reminderCadence: 'none',
  reminderCreatedAt: null,
  reminderLastDismissedAt: null
};

const MAX_COVER_BYTES = 2 * 1024 * 1024;

const readImageAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the cover image.'));
    reader.readAsDataURL(file);
  });

function AddEditModal({
  isOpen,
  bookmark,
  libraries,
  activeLibraryId,
  initialValues,
  onClose,
  onSave
}) {
  const titleInputRef = useRef(null);
  const modalRef = useRef(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const modalTitle = useMemo(
    () => (bookmark ? 'Edit bookmark' : 'Add bookmark'),
    [bookmark]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setForm(
      bookmark
        ? {
            title: bookmark.title,
            baseUrl: bookmark.baseUrl,
            currentChapter: String(bookmark.currentChapter),
            totalChapters: bookmark.totalChapters ? String(bookmark.totalChapters) : '',
            category: bookmark.category,
            coverImage: bookmark.coverImage || null,
            libraryId: String(bookmark.libraryId || libraries[0]?.id || ''),
            reminderCadence: bookmark.reminderCadence || 'none',
            reminderCreatedAt: bookmark.reminderCreatedAt || null,
            reminderLastDismissedAt: bookmark.reminderLastDismissedAt || null
          }
        : {
            ...emptyForm,
            ...initialValues,
            libraryId: String(
              initialValues?.libraryId ||
                (activeLibraryId === 'all' ? libraries[0]?.id || '' : activeLibraryId)
            )
          }
    );
    setError('');
    setIsSaving(false);

    window.setTimeout(() => {
      titleInputRef.current?.focus();
    }, 0);
  }, [activeLibraryId, bookmark, initialValues, isOpen, libraries]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !modalRef.current) {
        return;
      }

      const focusable = modalRef.current.querySelectorAll(
        'button, input, textarea, select, [href], [tabindex]:not([tabindex="-1"])'
      );

      if (!focusable.length) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const updateField = (fieldName, value) => {
    setForm((current) => ({ ...current, [fieldName]: value }));
  };

  const validate = () => {
    const title = form.title.trim();
    const baseUrl = form.baseUrl.trim();
    const currentChapter = Number(form.currentChapter);
    const libraryId = Number(form.libraryId);
    const totalChapters =
      form.totalChapters.trim() === '' ? null : Number(form.totalChapters);

    if (!title) {
      return 'Title is required.';
    }

    if (!baseUrl) {
      return 'Base URL is required.';
    }

    if (!Number.isInteger(libraryId) || !libraries.some((library) => library.id === libraryId)) {
      return 'Choose a library.';
    }

    if (!Number.isInteger(currentChapter) || currentChapter < 1) {
      return 'Current chapter must be a whole number of 1 or greater.';
    }

    if (
      totalChapters !== null &&
      (!Number.isInteger(totalChapters) || totalChapters < currentChapter)
    ) {
      return 'Total chapters must be empty or at least the current chapter.';
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await onSave({
        title: form.title,
        baseUrl: form.baseUrl,
        currentChapter: Number(form.currentChapter),
        totalChapters:
          form.totalChapters.trim() === '' ? null : Number(form.totalChapters),
        category: form.category,
        coverImage: form.coverImage,
        libraryId: Number(form.libraryId),
        reminderCadence: form.reminderCadence,
        reminderCreatedAt: form.reminderCreatedAt,
        reminderLastDismissedAt: form.reminderLastDismissedAt
      });
    } catch (saveError) {
      console.error(saveError);
      setError('Could not save this bookmark. Try again.');
      setIsSaving(false);
    }
  };

  const handleCoverChange = async (event) => {
    const [file] = event.target.files;
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Cover must be an image file.');
      return;
    }

    if (file.size > MAX_COVER_BYTES) {
      setError('Cover image must be 2 MB or smaller.');
      return;
    }

    try {
      const coverImage = await readImageAsDataUrl(file);
      updateField('coverImage', coverImage);
      setError('');
    } catch (coverError) {
      console.error(coverError);
      setError(coverError.message);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        ref={modalRef}
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bookmark-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="bookmark-modal-title">{modalTitle}</h2>
          <button
            className="close-button"
            type="button"
            onClick={onClose}
            aria-label="Close modal"
          >
            x
          </button>
        </header>

        <form className="bookmark-form" onSubmit={handleSubmit}>
          <label>
            <span>Title</span>
            <input
              ref={titleInputRef}
              type="text"
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
              required
            />
          </label>

          <label>
            <span>Base URL</span>
            <input
              type="text"
              value={form.baseUrl}
              onChange={(event) => updateField('baseUrl', event.target.value)}
              placeholder="https://site.example/chapter/{chapter}"
              required
            />
          </label>

          <div className="form-row">
            <label>
              <span>Current Chapter</span>
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={form.currentChapter}
                onChange={(event) => updateField('currentChapter', event.target.value)}
                required
              />
            </label>

            <label>
              <span>Total Chapters</span>
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={form.totalChapters}
                onChange={(event) => updateField('totalChapters', event.target.value)}
                placeholder="Optional"
              />
            </label>
          </div>

          <label>
            <span>Library</span>
            <select
              value={form.libraryId}
              onChange={(event) => updateField('libraryId', event.target.value)}
              required
            >
              {libraries.map((library) => (
                <option key={library.id} value={library.id}>
                  {library.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Category</span>
            <input
              type="text"
              value={form.category}
              onChange={(event) => updateField('category', event.target.value)}
              placeholder="Reading"
            />
          </label>

          <label>
            <span>Reminder</span>
            <select
              value={form.reminderCadence}
              onChange={(event) => {
                const nextCadence = event.target.value;
                setForm((current) => ({
                  ...current,
                  reminderCadence: nextCadence,
                  reminderCreatedAt:
                    nextCadence === 'none'
                      ? null
                      : current.reminderCreatedAt || new Date(),
                  reminderLastDismissedAt:
                    nextCadence === 'none' ? null : current.reminderLastDismissedAt
                }));
              }}
            >
              <option value="none">No reminder</option>
              <option value="daily">Daily update reminder</option>
              <option value="weekly">Weekly update reminder</option>
              <option value="monthly">Monthly update reminder</option>
            </select>
          </label>

          <div className="cover-field">
            <span>Cover Image</span>
            <div className="cover-control">
              <div className="cover-preview" aria-hidden="true">
                {form.coverImage ? (
                  <img src={form.coverImage} alt="" />
                ) : (
                  <span>No cover</span>
                )}
              </div>
              <div className="cover-buttons">
                <label className="file-button">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverChange}
                  />
                  Upload image
                </label>
                {form.coverImage && (
                  <button
                    className="secondary-action"
                    type="button"
                    onClick={() => updateField('coverImage', null)}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="modal-actions">
            <button className="secondary-action" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-action" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default AddEditModal;
