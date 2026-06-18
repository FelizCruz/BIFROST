import { useState } from 'react';

const statusLabels = {
  'local-only': 'Local only',
  syncing: 'Syncing',
  synced: 'Synced',
  'offline-pending': 'Offline changes pending',
  'sync-error': 'Sync error'
};

function SyncPanel({
  isConfigured,
  session,
  syncEnabled,
  syncStatus,
  syncMessage,
  onSignIn,
  onSignOut,
  onSyncNow,
  onEnableSync,
  onDisableSync
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSignIn(email.trim());
      setEmail('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const label = statusLabels[syncStatus] || 'Local only';
  const isSignedIn = Boolean(session?.user);

  return (
    <div className="sync-panel">
      <button
        className={`sync-button sync-${syncStatus}`}
        type="button"
        aria-label="Open sync options"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M17.4 7.2A6.8 6.8 0 0 0 5.1 9.4a4.9 4.9 0 0 0 .7 9.8h10.7a5.8 5.8 0 0 0 .9-11.5v-.5Zm-.9 9.7H5.8a2.6 2.6 0 0 1-.3-5.2l1.3-.1.3-1.3a4.5 4.5 0 0 1 8.1-1.5l.5.8 1 .1a3.5 3.5 0 0 1-.2 7.2Z" />
        </svg>
      </button>

      {isOpen && (
        <section className="sync-menu" aria-label="Sync options">
          <header>
            <div>
              <h2>{label}</h2>
              <p>{syncMessage || 'BIFROST works without an account.'}</p>
            </div>
          </header>

          {!isConfigured ? (
            <p className="sync-help">
              Add Supabase environment variables to enable optional sync.
            </p>
          ) : isSignedIn ? (
            <div className="sync-actions">
              <p className="sync-account">{session.user.email}</p>
              {syncEnabled ? (
                <button type="button" onClick={onDisableSync}>
                  Pause sync
                </button>
              ) : (
                <button type="button" onClick={onEnableSync}>
                  Start sync
                </button>
              )}
              <button type="button" onClick={onSyncNow} disabled={!syncEnabled}>
                Sync now
              </button>
              <button type="button" onClick={onSignOut}>
                Sign out
              </button>
            </div>
          ) : (
            <form className="sync-form" onSubmit={handleSubmit}>
              <label htmlFor="sync-email">Sign in to sync</label>
              <input
                id="sync-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="email@example.com"
                required
              />
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send magic link'}
              </button>
              <p>Signing in is optional and only used to sync across devices.</p>
            </form>
          )}
        </section>
      )}
    </div>
  );
}

export default SyncPanel;
