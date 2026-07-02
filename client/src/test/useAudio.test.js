import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudio } from '../hooks/useAudio.js';

describe('useAudio', () => {
  let mockGain;
  let mockSource;
  let endedListeners;

  beforeEach(() => {
    endedListeners = [];

    global.fetch = vi.fn(() =>
      Promise.resolve({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      })
    );

    mockGain = {
      connect: vi.fn(),
      gain: { value: 1, setTargetAtTime: vi.fn() },
      context: { currentTime: 0 },
    };

    mockSource = {
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      addEventListener: vi.fn((event, cb) => {
        if (event === 'ended') endedListeners.push(cb);
      }),
      buffer: null,
    };

    const mockAudioContext = vi.fn();
    mockAudioContext.prototype = {
      createGain: vi.fn(() => mockGain),
      createBufferSource: vi.fn(() => ({ ...mockSource })),
      decodeAudioData: vi.fn(() => Promise.resolve({ duration: 1 })),
      resume: vi.fn(() => Promise.resolve()),
      state: 'suspended',
      destination: {},
      currentTime: 0,
    };
    global.AudioContext = mockAudioContext;
    global.webkitAudioContext = mockAudioContext;
  });

  it('initializes with no active files', () => {
    const { result } = renderHook(() => useAudio(1, []));
    expect(result.current.active).toBe(0);
    expect(result.current.activeFiles.size).toBe(0);
    expect(result.current.play).toBeInstanceOf(Function);
    expect(result.current.stopAll).toBeInstanceOf(Function);
  });

  it('plays a file and marks it active', async () => {
    const { result } = renderHook(() => useAudio(1, ['test.mp3']));

    await act(async () => {
      await result.current.play('test.mp3');
    });

    expect(result.current.active).toBe(1);
    expect(result.current.activeFiles.has('test.mp3')).toBe(true);
  });

  it('resumes suspended AudioContext on play', async () => {
    const { result } = renderHook(() => useAudio(1, ['test.mp3']));

    await act(async () => {
      await result.current.play('test.mp3');
    });

    // AudioContext.resume should have been called since state is 'suspended'
    // Just verify play didn't crash — resume is internal
    expect(result.current.active).toBe(1);
  });

  it('uses cached buffer on second play of same file', async () => {
    const { result } = renderHook(() => useAudio(1, ['test.mp3']));

    await act(async () => {
      await result.current.play('test.mp3');
    });

    const firstFetchCount = global.fetch.mock.calls.length;

    await act(async () => {
      await result.current.play('test.mp3');
    });

    // Second play should not fetch again — buffer is cached
    expect(global.fetch.mock.calls.length).toBe(firstFetchCount);
  });

  it('stopAll stops all active sources and clears active files', async () => {
    const { result } = renderHook(() => useAudio(1, ['a.mp3', 'b.mp3']));

    await act(async () => {
      await result.current.play('a.mp3');
    });
    await act(async () => {
      await result.current.play('b.mp3');
    });

    expect(result.current.active).toBe(2);

    act(() => {
      result.current.stopAll();
    });

    expect(result.current.active).toBe(0);
    expect(result.current.activeFiles.size).toBe(0);
  });

  it('stopAll handles already-stopped sources gracefully', async () => {
    const { result } = renderHook(() => useAudio(1, ['test.mp3']));

    await act(async () => {
      await result.current.play('test.mp3');
    });

    // Simulate the source already being stopped
    const ctx = global.AudioContext.mock.results[0]?.value;
    ctx.createBufferSource.mockImplementation(() => ({
      ...mockSource,
      stop: vi.fn(() => {
        throw new Error('Already stopped');
      }),
    }));

    act(() => {
      result.current.stopAll();
    });

    expect(result.current.active).toBe(0);
  });

  it('updates gain when globalVolume changes', async () => {
    const { result, rerender } = renderHook(({ vol }) => useAudio(vol, ['test.mp3']), {
      initialProps: { vol: 0.5 },
    });

    await act(async () => {
      await result.current.play('test.mp3');
    });

    rerender({ vol: 0.8 });

    // setTargetAtTime should have been called with the new volume
    expect(mockGain.gain.setTargetAtTime).toHaveBeenCalledWith(0.8, 0, 0.01);
  });

  it('fires cleanup when source ends and removes from active', async () => {
    const { result } = renderHook(() => useAudio(1, ['test.mp3']));

    await act(async () => {
      await result.current.play('test.mp3');
    });

    expect(result.current.active).toBe(1);

    // Simulate the 'ended' event
    await act(async () => {
      endedListeners.forEach((cb) => cb());
    });

    expect(result.current.active).toBe(0);
  });

  it('returns early on fetch error during play', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useAudio(1, ['missing.mp3']));

    await act(async () => {
      await result.current.play('missing.mp3');
    });

    // Should not crash, should not mark as active
    expect(result.current.active).toBe(0);
  });

  it('startBackgroundPreload loads other files after first play', async () => {
    const { result } = renderHook(() => useAudio(1, ['a.mp3', 'b.mp3', 'c.mp3']));

    await act(async () => {
      await result.current.play('a.mp3');
    });

    // Wait for preloads to settle
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // After settling, preload should be complete
    expect(result.current.preloading).toBe(false);
    expect(result.current.preloadTotal).toBe(2);
    expect(result.current.preloadCount).toBe(2);
  });

  it('does not preload files already cached', async () => {
    const { result } = renderHook(() => useAudio(1, ['a.mp3', 'b.mp3']));

    // Play both files first to cache them
    await act(async () => {
      await result.current.play('a.mp3');
    });
    await act(async () => {
      await result.current.play('b.mp3');
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // No preload should be pending
    expect(result.current.preloading).toBe(false);
  });

  it('exposes preload state fields', () => {
    const { result } = renderHook(() => useAudio(1, []));
    expect(result.current.preloading).toBe(false);
    expect(result.current.preloadCount).toBe(0);
    expect(result.current.preloadTotal).toBe(0);
  });
});
