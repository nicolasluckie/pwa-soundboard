import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudio } from '../hooks/useAudio.js';

describe('useAudio', () => {
  beforeEach(() => {
    // Mock fetch and AudioContext
    global.fetch = vi.fn(() =>
      Promise.resolve({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      })
    );

    const mockAudioContext = vi.fn();
    mockAudioContext.prototype = {
      createGain: vi.fn(() => ({
        connect: vi.fn(),
        gain: { value: 1, setTargetAtTime: vi.fn() },
      })),
      createBufferSource: vi.fn(() => ({
        connect: vi.fn(),
        start: vi.fn(),
        addEventListener: vi.fn(),
      })),
      decodeAudioData: vi.fn(() => Promise.resolve({})),
      resume: vi.fn(() => Promise.resolve()),
      state: 'suspended',
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

  it('can call play without crashing', async () => {
    const { result } = renderHook(() => useAudio(1, ['test.mp3']));

    await act(async () => {
      await result.current.play('test.mp3');
    });

    // Just verify it doesn't crash - actual audio testing requires browser
    expect(result.current.play).toBeInstanceOf(Function);
  });

  it('can call stopAll without crashing', () => {
    const { result } = renderHook(() => useAudio(1, []));

    act(() => {
      result.current.stopAll();
    });

    expect(result.current.active).toBe(0);
  });
});
