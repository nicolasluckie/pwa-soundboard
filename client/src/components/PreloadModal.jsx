import { useState, useEffect } from 'react';

function PreloadModal({ visible, count, total }) {
  const [rendered, setRendered] = useState(false);
  const [animatingOut, setAnimatingOut] = useState(false);
  const [prevVisible, setPrevVisible] = useState(visible);

  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setAnimatingOut(false);
      setRendered(true);
    } else if (rendered) {
      setAnimatingOut(true);
    }
  }

  useEffect(() => {
    if (animatingOut && !visible) {
      const t = setTimeout(() => setRendered(false), 600);
      return () => clearTimeout(t);
    }
  }, [animatingOut, visible]);

  if (!rendered) return null;

  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className={`progress-bar-track ${animatingOut ? 'progress-bar-out' : 'progress-bar-in'}`}>
      <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default PreloadModal;
