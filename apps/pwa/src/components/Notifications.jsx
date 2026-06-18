import { useMemo, useState } from 'react';

const CADENCE_DAYS = {
  daily: 1,
  weekly: 7,
  monthly: 30
};

const formatDate = (date) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric'
  }).format(date);

const getNextReminderDate = (bookmark) => {
  const days = CADENCE_DAYS[bookmark.reminderCadence];

  if (!days) {
    return null;
  }

  const anchor = new Date(
    bookmark.reminderLastDismissedAt ||
      bookmark.reminderCreatedAt ||
      bookmark.updatedAt ||
      bookmark.createdAt
  );

  if (Number.isNaN(anchor.getTime())) {
    return null;
  }

  return new Date(anchor.getTime() + days * 24 * 60 * 60 * 1000);
};

function Notifications({ bookmarks, libraries, onDismissReminder }) {
  const [isOpen, setIsOpen] = useState(false);

  const reminderItems = useMemo(() => {
    const now = new Date();
    const libraryById = new Map(
      libraries.map((library) => [library.id, library.name])
    );

    return bookmarks
      .map((bookmark) => {
        const nextReminderAt = getNextReminderDate(bookmark);

        if (!nextReminderAt) {
          return null;
        }

        return {
          bookmark,
          nextReminderAt,
          isDue: nextReminderAt <= now,
          libraryName: libraryById.get(bookmark.libraryId) || 'Library'
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.nextReminderAt - b.nextReminderAt);
  }, [bookmarks, libraries]);

  const dueCount = reminderItems.filter((item) => item.isDue).length;

  return (
    <div className="notifications">
      <button
        className="notifications-button"
        type="button"
        aria-label="Open reminders"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M12 22a2.7 2.7 0 0 0 2.7-2.5H9.3A2.7 2.7 0 0 0 12 22Zm7-6.3-1.9-2.2V9a5.2 5.2 0 0 0-4-5.1V2h-2.2v1.9A5.2 5.2 0 0 0 7 9v4.5l-2 2.2V18h14v-2.3Z" />
        </svg>
        {dueCount > 0 && <span className="notification-badge">{dueCount}</span>}
      </button>

      {isOpen && (
        <section className="notifications-menu" aria-label="Reminder list">
          <header>
            <h2>Reminders</h2>
            <span>{dueCount} due</span>
          </header>

          {reminderItems.length ? (
            <div className="reminder-list">
              {reminderItems.map(({ bookmark, nextReminderAt, isDue, libraryName }) => (
                <article
                  key={bookmark.id}
                  className={isDue ? 'reminder-item due' : 'reminder-item'}
                >
                  <div>
                    <strong>{bookmark.title}</strong>
                    <p>
                      {libraryName} · {bookmark.reminderCadence} ·{' '}
                      {isDue ? 'Due now' : `Next ${formatDate(nextReminderAt)}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDismissReminder(bookmark.id)}
                  >
                    Dismiss
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="reminder-empty">No reminders set.</p>
          )}
        </section>
      )}
    </div>
  );
}

export default Notifications;
