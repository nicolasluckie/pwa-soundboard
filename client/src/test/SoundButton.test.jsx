import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SoundButton from '../components/SoundButton.jsx';

describe('SoundButton', () => {
  const sample = {
    id: 'test',
    name: 'Test Sound',
    file: 'test.mp3',
    color: '#ff0000',
    emoji: '🔥',
    tags: ['test'],
  };

  it('renders the sound name', () => {
    render(<SoundButton sample={sample} onPlay={() => {}} isPlaying={false} />);
    expect(screen.getByText('Test Sound')).toBeDefined();
  });

  it('renders emoji when present', () => {
    render(<SoundButton sample={sample} onPlay={() => {}} isPlaying={false} />);
    expect(screen.getByText('🔥')).toBeDefined();
  });

  it('calls onPlay with filename when clicked', () => {
    const onPlay = vi.fn();
    render(<SoundButton sample={sample} onPlay={onPlay} isPlaying={false} />);
    fireEvent.click(screen.getByLabelText('Play Test Sound'));
    expect(onPlay).toHaveBeenCalledWith('test.mp3');
  });

  it('applies pressed class when isPlaying is true', () => {
    render(<SoundButton sample={sample} onPlay={() => {}} isPlaying={true} />);
    const button = screen.getByLabelText('Play Test Sound');
    expect(button.className).toContain('pressed');
  });

  it('renders icon image when icon is provided', () => {
    const sampleWithIcon = { ...sample, icon: '/icons/test.webp', emoji: null };
    render(<SoundButton sample={sampleWithIcon} onPlay={() => {}} isPlaying={false} />);
    expect(screen.getByText('Test Sound')).toBeDefined();
  });
});
