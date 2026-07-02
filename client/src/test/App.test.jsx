import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App.jsx';

const mockSamples = [
  {
    id: 'yeet',
    name: 'Yeet',
    file: 'yeet.mp3',
    color: '#00d4ff',
    emoji: '🚀',
    tags: ['meme', 'viral'],
  },
  { id: 'bruh', name: 'Bruh', file: 'bruh.mp3', color: '#ff6b6b', emoji: '💀', tags: ['meme'] },
];

describe('App', () => {
  beforeEach(() => {
    global.fetch = vi.fn((url) => {
      if (url === '/api/samples') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSamples),
        });
      }
      return Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        json: () => Promise.resolve({}),
      });
    });

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

  it('renders title', async () => {
    render(<App />);
    expect(screen.getByText('Soundboard')).toBeDefined();
  });

  it('shows loading state initially', () => {
    render(<App />);
    expect(screen.getByText('Loading sounds...')).toBeDefined();
  });

  it('loads and displays samples from API', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Yeet')).toBeDefined();
      expect(screen.getByText('Bruh')).toBeDefined();
    });
  });

  it('filters samples by search query', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Yeet')).toBeDefined());

    const searchInput = screen.getByPlaceholderText('Search sounds...');
    fireEvent.change(searchInput, { target: { value: 'yeet' } });

    expect(screen.getByText('Yeet')).toBeDefined();
    expect(screen.queryByText('Bruh')).toBeNull();
  });

  it('filters samples by tag', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Yeet')).toBeDefined());

    const searchInput = screen.getByPlaceholderText('Search sounds...');
    fireEvent.change(searchInput, { target: { value: 'viral' } });

    expect(screen.getByText('Yeet')).toBeDefined();
    expect(screen.queryByText('Bruh')).toBeNull();
  });

  it('shows no results message for unmatched query', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Yeet')).toBeDefined());

    const searchInput = screen.getByPlaceholderText('Search sounds...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    expect(screen.getByText(/No sounds match/)).toBeDefined();
  });

  it('renders stop all button', async () => {
    render(<App />);
    expect(screen.getByLabelText('Stop all sounds')).toBeDefined();
  });

  it('renders add sound button', async () => {
    render(<App />);
    expect(screen.getByLabelText('Add new sound')).toBeDefined();
  });

  it('opens upload modal when add sound clicked', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Yeet')).toBeDefined());

    fireEvent.click(screen.getByLabelText('Add new sound'));
    expect(screen.getByText('Add New Sound')).toBeDefined();
  });

  it('stop button is disabled when no sounds playing', async () => {
    render(<App />);
    const stopButton = screen.getByLabelText('Stop all sounds');
    expect(stopButton.disabled).toBe(true);
  });
});
