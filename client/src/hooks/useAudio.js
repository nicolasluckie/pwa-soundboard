import { useRef, useEffect, useState, useCallback } from 'react';

export function useAudio(globalVolume, filenames = []) {
  const ctxRef = useRef(null);
  const buffersRef = useRef(new Map());
  const nodesRef = useRef([]);
  const globalVolumeRef = useRef(globalVolume);
  const gainRef = useRef(null);
  const backgroundStartedRef = useRef(false);
  const [activeFiles, setActiveFiles] = useState(new Set());
  const [preloading, setPreloading] = useState(false);
  const [preloadCount, setPreloadCount] = useState(0);
  const [preloadTotal, setPreloadTotal] = useState(0);

  useEffect(() => {
    globalVolumeRef.current = globalVolume;
    if (gainRef.current) {
      gainRef.current.gain.setTargetAtTime(globalVolume, gainRef.current.context.currentTime, 0.01);
    }
  }, [globalVolume]);

  const recompute = useCallback(() => {
    setActiveFiles(new Set(nodesRef.current.map(({ filename }) => filename)));
  }, []);

  const startBackgroundPreload = useCallback(
    (ctx, skip) => {
      if (backgroundStartedRef.current) return;
      backgroundStartedRef.current = true;
      const toLoad = filenames.filter((f) => f !== skip && !buffersRef.current.has(f));
      if (toLoad.length === 0) return;
      setPreloading(true);
      setPreloadCount(0);
      setPreloadTotal(toLoad.length);
      const pending = toLoad.map((filename) =>
        fetch(`/audio/${filename}`)
          .then((r) => r.arrayBuffer())
          .then((ab) => ctx.decodeAudioData(ab))
          .then((buf) => {
            buffersRef.current.set(filename, buf);
            setPreloadCount((n) => n + 1);
          })
          .catch(() => {
            setPreloadCount((n) => n + 1);
          })
      );
      Promise.allSettled(pending).then(() => setPreloading(false));
    },
    [filenames]
  );

  const getContext = useCallback(() => {
    if (ctxRef.current) return ctxRef.current;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const gain = ctx.createGain();
    gain.gain.value = globalVolumeRef.current;
    gain.connect(ctx.destination);
    ctxRef.current = ctx;
    gainRef.current = gain;
    return ctx;
  }, []);

  const play = useCallback(
    async (filename) => {
      const ctx = getContext();

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      let buffer = buffersRef.current.get(filename);
      if (!buffer) {
        try {
          const ab = await fetch(`/audio/${filename}`).then((r) => r.arrayBuffer());
          buffer = await ctx.decodeAudioData(ab);
          buffersRef.current.set(filename, buffer);
        } catch {
          return;
        }
      }

      startBackgroundPreload(ctx, filename);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(gainRef.current);

      const entry = { source, filename };

      const cleanup = () => {
        const idx = nodesRef.current.indexOf(entry);
        if (idx !== -1) nodesRef.current.splice(idx, 1);
        recompute();
      };

      source.addEventListener('ended', cleanup);
      nodesRef.current.push(entry);
      source.start(0);
      recompute();
    },
    [getContext, recompute, startBackgroundPreload]
  );

  const stopAll = useCallback(() => {
    nodesRef.current.forEach(({ source }) => {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
    });
    nodesRef.current = [];
    setActiveFiles(new Set());
  }, []);

  const active = activeFiles.size;

  return { play, stopAll, active, activeFiles, preloading, preloadCount, preloadTotal };
}
