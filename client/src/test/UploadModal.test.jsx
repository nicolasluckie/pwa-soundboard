import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UploadModal from '../components/UploadModal.jsx';

describe('UploadModal', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('renders dialog when open', () => {
    render(<UploadModal open={true} onOpenChange={() => {}} onUploaded={() => {}} />);
    expect(screen.getByText('Add New Sound')).toBeDefined();
    expect(screen.getByText('Drop file here or click to browse')).toBeDefined();
  });

  it('does not render when closed', () => {
    render(<UploadModal open={false} onOpenChange={() => {}} onUploaded={() => {}} />);
    expect(screen.queryByText('Add New Sound')).toBeNull();
  });

  it('shows error when submitting without file', () => {
    render(<UploadModal open={true} onOpenChange={() => {}} onUploaded={() => {}} />);
    const form = document.querySelector('form');
    fireEvent.submit(form);
    expect(screen.getByText('Please select a file')).toBeDefined();
  });

  it('auto-generates slug from name', () => {
    render(<UploadModal open={true} onOpenChange={() => {}} onUploaded={() => {}} />);
    const nameInput = screen.getByPlaceholderText('My Cool Sound');
    fireEvent.change(nameInput, { target: { value: 'My Cool Sound!' } });
    const slugInput = screen.getByPlaceholderText('my-cool-sound');
    expect(slugInput.value).toBe('my-cool-sound');
  });

  it('renders color swatches', () => {
    render(<UploadModal open={true} onOpenChange={() => {}} onUploaded={() => {}} />);
    const swatches = screen
      .getAllByRole('button')
      .filter((b) => b.className.includes('color-swatch'));
    expect(swatches).toHaveLength(6);
  });

  it('selects a color when swatch clicked', () => {
    render(<UploadModal open={true} onOpenChange={() => {}} onUploaded={() => {}} />);
    const redSwatch = screen.getByLabelText('red');
    fireEvent.click(redSwatch);
    expect(redSwatch.className).toContain('selected');
  });

  it('handles file selection via input', () => {
    render(<UploadModal open={true} onOpenChange={() => {}} onUploaded={() => {}} />);
    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(screen.getByText('test.mp3')).toBeDefined();
  });

  it('auto-fills name from filename', () => {
    render(<UploadModal open={true} onOpenChange={() => {}} onUploaded={() => {}} />);
    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['audio'], 'Cool Sound.mp3', { type: 'audio/mpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(screen.getByDisplayValue('Cool Sound')).toBeDefined();
  });

  it('submits form and calls onUploaded on success', async () => {
    const onUploaded = vi.fn();
    const onOpenChange = vi.fn();
    const mockSample = {
      id: 'test',
      name: 'Test',
      file: 'test.mp3',
      color: '#00d4ff',
      emoji: '🔊',
      tags: ['meme'],
    };
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, sample: mockSample }),
    });

    render(<UploadModal open={true} onOpenChange={onOpenChange} onUploaded={onUploaded} />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const nameInput = screen.getByPlaceholderText('My Cool Sound');
    fireEvent.change(nameInput, { target: { value: 'Test' } });

    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledWith(mockSample);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('shows error on upload failure', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'ffmpeg conversion failed' }),
    });

    render(<UploadModal open={true} onOpenChange={() => {}} onUploaded={() => {}} />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const nameInput = screen.getByPlaceholderText('My Cool Sound');
    fireEvent.change(nameInput, { target: { value: 'Test' } });

    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('ffmpeg conversion failed')).toBeDefined();
    });
  });

  it('calls onOpenChange when cancel clicked', () => {
    const onOpenChange = vi.fn();
    render(<UploadModal open={true} onOpenChange={onOpenChange} onUploaded={() => {}} />);
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('handles drag over state', () => {
    render(<UploadModal open={true} onOpenChange={() => {}} onUploaded={() => {}} />);
    const dropZone = document.querySelector('.drop-zone');
    fireEvent.dragOver(dropZone, { preventDefault: () => {} });
    expect(dropZone.className).toContain('drag-over');
  });

  it('handles drag leave', () => {
    render(<UploadModal open={true} onOpenChange={() => {}} onUploaded={() => {}} />);
    const dropZone = document.querySelector('.drop-zone');
    fireEvent.dragOver(dropZone, { preventDefault: () => {} });
    expect(dropZone.className).toContain('drag-over');
    fireEvent.dragLeave(dropZone);
    expect(dropZone.className).not.toContain('drag-over');
  });

  it('handles file drop', () => {
    render(<UploadModal open={true} onOpenChange={() => {}} onUploaded={() => {}} />);
    const dropZone = document.querySelector('.drop-zone');
    const file = new File(['audio'], 'dropped.mp3', { type: 'audio/mpeg' });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
      preventDefault: () => {},
    });
    expect(screen.getByText('dropped.mp3')).toBeDefined();
  });

  it('updates tags input', () => {
    render(<UploadModal open={true} onOpenChange={() => {}} onUploaded={() => {}} />);
    const tagsInput = screen.getByPlaceholderText('meme, reaction, funny');
    fireEvent.change(tagsInput, { target: { value: 'meme, viral, 2010s' } });
    expect(tagsInput.value).toBe('meme, viral, 2010s');
  });

  it('updates emoji input', () => {
    render(<UploadModal open={true} onOpenChange={() => {}} onUploaded={() => {}} />);
    const emojiInput = document.querySelector('.emoji-input');
    fireEvent.change(emojiInput, { target: { value: '🎉' } });
    expect(emojiInput.value).toBe('🎉');
  });

  it('renders icon upload field', () => {
    render(<UploadModal open={true} onOpenChange={() => {}} onUploaded={() => {}} />);
    expect(screen.getByText('Icon (optional)')).toBeDefined();
    expect(screen.getByText('Click or drop')).toBeDefined();
  });

  it('shows icon preview when image selected', async () => {
    render(<UploadModal open={true} onOpenChange={() => {}} onUploaded={() => {}} />);
    const iconInput = document.querySelectorAll('input[type="file"]')[1];
    const iconFile = new File(['img'], 'test.png', { type: 'image/png' });
    fireEvent.change(iconInput, { target: { files: [iconFile] } });
    await waitFor(() => {
      expect(screen.getByAltText('Icon preview')).toBeDefined();
    });
  });

  it('removes icon preview when remove button clicked', async () => {
    render(<UploadModal open={true} onOpenChange={() => {}} onUploaded={() => {}} />);
    const iconInput = document.querySelectorAll('input[type="file"]')[1];
    const iconFile = new File(['img'], 'test.png', { type: 'image/png' });
    fireEvent.change(iconInput, { target: { files: [iconFile] } });
    await waitFor(() => {
      expect(screen.getByAltText('Icon preview')).toBeDefined();
    });
    const removeBtn = document.querySelector('.icon-upload-remove');
    fireEvent.click(removeBtn);
    expect(screen.getByText('Click or drop')).toBeDefined();
  });

  it('appends icon to FormData when submitting with icon selected', async () => {
    const mockSample = {
      id: 'test',
      name: 'Test',
      file: 'test.mp3',
      color: '#00d4ff',
      emoji: '🔊',
      tags: ['meme'],
    };
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, sample: mockSample }),
    });

    render(<UploadModal open={true} onOpenChange={() => {}} onUploaded={() => {}} />);

    // Select audio file
    const audioInput = document.querySelectorAll('input[type="file"]')[0];
    const audioFile = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });
    fireEvent.change(audioInput, { target: { files: [audioFile] } });

    // Select icon file
    const iconInput = document.querySelectorAll('input[type="file"]')[1];
    const iconFile = new File(['img'], 'icon.png', { type: 'image/png' });
    fireEvent.change(iconInput, { target: { files: [iconFile] } });
    await waitFor(() => {
      expect(screen.getByAltText('Icon preview')).toBeDefined();
    });

    // Fill name and submit
    fireEvent.change(screen.getByPlaceholderText('My Cool Sound'), { target: { value: 'Test' } });
    fireEvent.submit(document.querySelector('form'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const formDataCall = global.fetch.mock.calls[0];
    const sentBody = formDataCall[1].body;
    expect(sentBody.get('icon')).toBeInstanceOf(File);
    expect(sentBody.get('icon').name).toBe('icon.png');
  });

  it('does not append icon to FormData when no icon selected', async () => {
    const mockSample = {
      id: 'test',
      name: 'Test',
      file: 'test.mp3',
      color: '#00d4ff',
      emoji: '🔊',
      tags: ['meme'],
    };
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, sample: mockSample }),
    });

    render(<UploadModal open={true} onOpenChange={() => {}} onUploaded={() => {}} />);

    const audioInput = document.querySelector('input[type="file"]');
    const audioFile = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });
    fireEvent.change(audioInput, { target: { files: [audioFile] } });

    fireEvent.change(screen.getByPlaceholderText('My Cool Sound'), { target: { value: 'Test' } });
    fireEvent.submit(document.querySelector('form'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const sentBody = global.fetch.mock.calls[0][1].body;
    expect(sentBody.get('icon')).toBeNull();
  });

  it('handles icon drag-and-drop', async () => {
    render(<UploadModal open={true} onOpenChange={() => {}} onUploaded={() => {}} />);
    const iconZone = document.querySelector('.icon-upload');
    const iconFile = new File(['img'], 'dropped.png', { type: 'image/png' });
    fireEvent.drop(iconZone, {
      dataTransfer: { files: [iconFile] },
    });
    await waitFor(() => {
      expect(screen.getByAltText('Icon preview')).toBeDefined();
    });
  });

  it('sends correct slug when uploading with duplicate slug name', async () => {
    const mockSample = {
      id: 'test',
      name: 'Test',
      file: 'test.mp3',
      color: '#00d4ff',
      emoji: '🔊',
      tags: ['meme'],
    };
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, sample: mockSample }),
    });

    render(<UploadModal open={true} onOpenChange={() => {}} onUploaded={() => {}} />);

    const audioInput = document.querySelector('input[type="file"]');
    fireEvent.change(audioInput, {
      target: { files: [new File(['audio'], 'test.mp3', { type: 'audio/mpeg' })] },
    });

    fireEvent.change(screen.getByPlaceholderText('My Cool Sound'), { target: { value: 'Test' } });
    // Explicitly set the slug to simulate a duplicate
    fireEvent.change(screen.getByPlaceholderText('my-cool-sound'), {
      target: { value: 'existing-slug' },
    });

    fireEvent.submit(document.querySelector('form'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const sentBody = global.fetch.mock.calls[0][1].body;
    expect(sentBody.get('slug')).toBe('existing-slug');
  });

  it('sends icon file with same slug name as existing icon (overwrite)', async () => {
    const mockSample = {
      id: 'existing-slug',
      name: 'Updated',
      file: 'user/existing-slug.mp3',
      color: '#00d4ff',
      emoji: '🔊',
      icon: '/icons/user/existing-slug.webp',
      tags: ['meme'],
    };
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, sample: mockSample }),
    });

    render(<UploadModal open={true} onOpenChange={() => {}} onUploaded={() => {}} />);

    const audioInput = document.querySelectorAll('input[type="file"]')[0];
    fireEvent.change(audioInput, {
      target: { files: [new File(['audio'], 'test.mp3', { type: 'audio/mpeg' })] },
    });

    const iconInput = document.querySelectorAll('input[type="file"]')[1];
    const iconFile = new File(['img'], 'replacement.png', { type: 'image/png' });
    fireEvent.change(iconInput, { target: { files: [iconFile] } });
    await waitFor(() => {
      expect(screen.getByAltText('Icon preview')).toBeDefined();
    });

    fireEvent.change(screen.getByPlaceholderText('My Cool Sound'), {
      target: { value: 'Updated' },
    });
    fireEvent.change(screen.getByPlaceholderText('my-cool-sound'), {
      target: { value: 'existing-slug' },
    });

    fireEvent.submit(document.querySelector('form'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const sentBody = global.fetch.mock.calls[0][1].body;
    expect(sentBody.get('slug')).toBe('existing-slug');
    expect(sentBody.get('icon')).toBeInstanceOf(File);
    expect(sentBody.get('icon').name).toBe('replacement.png');
  });

  it('handles fetch network error on upload', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'));

    render(<UploadModal open={true} onOpenChange={() => {}} onUploaded={() => {}} />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const nameInput = screen.getByPlaceholderText('My Cool Sound');
    fireEvent.change(nameInput, { target: { value: 'Test' } });

    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeDefined();
    });
  });
});
