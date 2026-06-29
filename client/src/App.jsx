import { useState, useMemo, Fragment } from 'react';
import { useAudio } from './hooks/useAudio.js';
import SoundButton from './components/SoundButton.jsx';
import SearchBar from './components/SearchBar.jsx';
import InstallPrompt from './components/InstallPrompt.jsx';
import PreloadModal from './components/PreloadModal.jsx';
import samples from './data/samples.json';
import { Square } from 'lucide-react';

function App() {
  const [query, setQuery] = useState('');
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
  }, [query]);

  return (
    <Fragment>
      <div className="app">
        <header className="top-bar">
          <div className="top-bar-row title-row">
            <h1 className="title">Soundboard</h1>
            <InstallPrompt />
          </div>
          <div className="top-bar-row">
            <SearchBar value={query} onChange={setQuery} />
          </div>
          <div className="top-bar-row">
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
        </header>

        <main className="grid">
          {filtered.map((sample) => (
            <SoundButton
              key={sample.id}
              sample={sample}
              onPlay={play}
              isPlaying={activeFiles.has(sample.file)}
            />
          ))}
          {filtered.length === 0 && <p className="empty">No sounds match &quot;{query}&quot;.</p>}
        </main>
      </div>
      <PreloadModal visible={preloading} count={preloadCount} total={preloadTotal} />
    </Fragment>
  );
}

export default App;
