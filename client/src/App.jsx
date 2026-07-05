import { useState, useMemo, useEffect, Fragment } from 'react';
import { useAudio } from './hooks/useAudio.js';
import SoundButton from './components/SoundButton.jsx';
import SearchBar from './components/SearchBar.jsx';
import InstallPrompt from './components/InstallPrompt.jsx';
import PreloadModal from './components/PreloadModal.jsx';
import UploadModal from './components/UploadModal.jsx';
import { Square, Plus, RefreshCw } from 'lucide-react';

function App() {
  const [query, setQuery] = useState('');
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [refreshOpen, setRefreshOpen] = useState(false);

  useEffect(() => {
    fetch('/api/samples')
      .then((r) => r.json())
      .then((data) => {
        setSamples(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const { play, stopAll, active, activeFiles, preloading, preloadCount, preloadTotal } = useAudio(
    1,
    samples.map((s) => s.file)
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? samples.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            (s.emoji && s.emoji.includes(q)) ||
            (s.tags && s.tags.some((t) => t.toLowerCase().includes(q)))
        )
      : samples;
  }, [query, samples]);

  return (
    <Fragment>
      <div className="app">
        <header className="top-bar">
          <div className="top-bar-row title-row">
            <h1 className="title">Soundboard</h1>
            <button
              className="refresh-button"
              onClick={() => setRefreshOpen(true)}
              aria-label="Refresh app cache"
              title="Refresh app cache"
            >
              <RefreshCw size={16} />
            </button>
            <button
              className="upload-button"
              onClick={() => setUploadOpen(true)}
              aria-label="Add new sound"
              title="Add new sound"
            >
              <Plus size={16} />
            </button>
            <InstallPrompt />
          </div>
          <div className="top-bar-row">
            <SearchBar value={query} onChange={setQuery} />
          </div>
        </header>
        <div className="stop-row">
          <button
            className="stop-button"
            onClick={stopAll}
            disabled={active === 0}
            aria-label="Stop all sounds"
            title="Stop all sounds"
          >
            <Square size={18} />
            <span>Stop all sounds</span>
          </button>
        </div>

        <main className="grid">
          {loading ? (
            <p className="empty">Loading sounds...</p>
          ) : (
            filtered.map((sample) => (
              <SoundButton
                key={sample.id}
                sample={sample}
                onPlay={play}
                isPlaying={activeFiles.has(sample.file)}
              />
            ))
          )}
          {!loading && filtered.length === 0 && (
            <p className="empty">No sounds match &quot;{query}&quot;.</p>
          )}
        </main>

        <footer className="app-footer">
          <a
            className="version"
            href="https://github.com/nicolasluckie/pwa-soundboard/releases"
            target="_blank"
            rel="noopener noreferrer"
          >
            v{__APP_VERSION__}
          </a>
        </footer>
      </div>
      <PreloadModal visible={preloading} count={preloadCount} total={preloadTotal} />
      {refreshOpen && (
        <div
          className="dialog-overlay"
          onClick={() => setRefreshOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm cache refresh"
        >
          <div className="dialog-content refresh-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="refresh-text">
              This will clear the cached app data and reload. Continue?
            </p>
            <div className="refresh-actions">
              <button className="refresh-cancel" onClick={() => setRefreshOpen(false)}>
                Cancel
              </button>
              <button
                className="refresh-confirm"
                onClick={async () => {
                  if ('serviceWorker' in navigator) {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(regs.map((r) => r.unregister()));
                  }
                  if ('caches' in window) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map((k) => caches.delete(k)));
                  }
                  window.location.reload();
                }}
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}
      <UploadModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={(sample) =>
          setSamples((prev) => {
            const idx = prev.findIndex((s) => s.id === sample.id);
            if (idx !== -1) {
              const next = [...prev];
              next[idx] = sample;
              return next;
            }
            return [...prev, sample];
          })
        }
      />
    </Fragment>
  );
}

export default App;
