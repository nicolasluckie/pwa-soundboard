import { useState, useRef, useEffect, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Upload, X, Loader2, ImageIcon, Trash2 } from 'lucide-react';

const COLORS = [
  { name: 'red', value: '#ff6b6b' },
  { name: 'green', value: '#34d399' },
  { name: 'blue', value: '#00d4ff' },
  { name: 'pink', value: '#f472b6' },
  { name: 'purple', value: '#a78bfa' },
  { name: 'yellow', value: '#fbbf24' },
];

function makeSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function UploadModal({ open, onOpenChange, onUploaded }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [emoji, setEmoji] = useState('🔊');
  const [color, setColor] = useState('#00d4ff');
  const [tags, setTags] = useState('meme');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState('');
  const [iconMode, setIconMode] = useState('emoji'); // 'emoji' | 'upload' | 'library'
  const [libraryIcons, setLibraryIcons] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [selectedLibraryIcon, setSelectedLibraryIcon] = useState('');
  const fileInputRef = useRef(null);
  const iconInputRef = useRef(null);

  const loadLibraryIcons = useCallback(async () => {
    setLibraryLoading(true);
    try {
      const res = await fetch('/api/icons');
      const data = await res.json();
      setLibraryIcons(Array.isArray(data) ? data : []);
    } catch {
      setLibraryIcons([]);
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setFile(null);
      setName('');
      setSlug('');
      setEmoji('🔊');
      setColor('#00d4ff');
      setTags('meme');
      setError('');
      setDragOver(false);
      setUploading(false);
      setIconFile(null);
      setIconPreview('');
      setIconMode('emoji');
      setSelectedLibraryIcon('');
      loadLibraryIcons();
    }
  }, [open, loadLibraryIcons]);

  useEffect(() => {
    if (name && !slug) {
      setSlug(makeSlug(name));
    }
  }, [name, slug]);

  const handleFile = (selected) => {
    if (!selected) return;
    setFile(selected);
    if (!name) {
      const base = selected.name.replace(/\.[^.]+$/, '');
      setName(base);
    }
    setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  const handleIconSelect = (selected) => {
    if (!selected) return;
    setIconFile(selected);
    const reader = new FileReader();
    reader.onload = (e) => setIconPreview(e.target.result);
    reader.readAsDataURL(selected);
  };

  const handleIconDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleIconSelect(dropped);
  };

  const handleDeleteLibraryIcon = async (e, filename) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/icons/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to delete icon');
        return;
      }
      if (selectedLibraryIcon === filename) setSelectedLibraryIcon('');
      setLibraryIcons((prev) => prev.filter((icon) => icon.filename !== filename));
    } catch {
      setError('Failed to delete icon');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name.trim());
      formData.append('slug', slug || makeSlug(name));
      formData.append('emoji', emoji);
      formData.append('color', color);
      formData.append('tags', tags);
      if (iconMode === 'upload' && iconFile) {
        formData.append('icon', iconFile);
      } else if (iconMode === 'library' && selectedLibraryIcon) {
        formData.append('existingIcon', selectedLibraryIcon);
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      onUploaded(data.sample);
      onOpenChange(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content upload-dialog">
          <Dialog.Close className="dialog-close">
            <X size={18} />
          </Dialog.Close>
          <Dialog.Title className="dialog-title">Add New Sound</Dialog.Title>
          <Dialog.Description className="dialog-description">
            Upload an audio or video file. It will be normalized to MP3 automatically.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="upload-form">
            <div
              className={`drop-zone ${dragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.wav,.ogg,.aac,.m4a,.flac,.wma,.mp4,.mov,.avi,.mkv,.webm,.m4v,audio/*,video/*"
                onChange={(e) => handleFile(e.target.files[0])}
                style={{ display: 'none' }}
              />
              {file ? (
                <div className="drop-zone-file">
                  <Upload size={24} />
                  <span>{file.name}</span>
                  <span className="drop-zone-size">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                </div>
              ) : (
                <div className="drop-zone-placeholder">
                  <Upload size={24} />
                  <span>Drop file here or click to browse</span>
                  <span className="drop-zone-hint">Audio or video, up to 50 MB</span>
                </div>
              )}
            </div>

            <label className="form-label">
              <span>Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Cool Sound"
                required
              />
            </label>

            <label className="form-label">
              <span>Slug (filename)</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="my-cool-sound"
              />
            </label>

            <div className="form-label">
              <span>Icon</span>
              <div className="icon-mode-tabs">
                <button
                  type="button"
                  className={`icon-mode-tab ${iconMode === 'emoji' ? 'selected' : ''}`}
                  onClick={() => setIconMode('emoji')}
                >
                  Emoji
                </button>
                <button
                  type="button"
                  className={`icon-mode-tab ${iconMode === 'upload' ? 'selected' : ''}`}
                  onClick={() => setIconMode('upload')}
                >
                  New image
                </button>
                <button
                  type="button"
                  className={`icon-mode-tab ${iconMode === 'library' ? 'selected' : ''}`}
                  onClick={() => setIconMode('library')}
                >
                  Choose existing
                </button>
              </div>

              {iconMode === 'emoji' && (
                <input
                  type="text"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  maxLength={4}
                  className="emoji-input"
                />
              )}

              {iconMode === 'upload' && (
                <div
                  className={`icon-upload ${iconPreview ? 'has-icon' : ''}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleIconDrop}
                  onClick={() => iconInputRef.current?.click()}
                >
                  <input
                    ref={iconInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.gif,.webp,image/png,image/jpeg,image/gif,image/webp"
                    onChange={(e) => handleIconSelect(e.target.files[0])}
                    style={{ display: 'none' }}
                  />
                  {iconPreview ? (
                    <div className="icon-upload-preview">
                      <img src={iconPreview} alt="Icon preview" />
                      <button
                        type="button"
                        className="icon-upload-remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIconFile(null);
                          setIconPreview('');
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="icon-upload-placeholder">
                      <ImageIcon size={20} />
                      <span>Click or drop</span>
                    </div>
                  )}
                </div>
              )}

              {iconMode === 'library' && (
                <div className="icon-library">
                  {libraryLoading ? (
                    <div className="icon-library-empty">Loading icons…</div>
                  ) : libraryIcons.length === 0 ? (
                    <div className="icon-library-empty">
                      No icons uploaded yet — upload one first to reuse it here.
                    </div>
                  ) : (
                    <div className="icon-library-grid">
                      {libraryIcons.map((icon) => (
                        <div
                          key={icon.filename}
                          className={`icon-library-item ${selectedLibraryIcon === icon.filename ? 'selected' : ''}`}
                          onClick={() => setSelectedLibraryIcon(icon.filename)}
                          title={icon.filename}
                        >
                          <img src={icon.url} alt={icon.filename} />
                          {icon.usageCount === 0 && (
                            <button
                              type="button"
                              className="icon-library-remove"
                              onClick={(e) => handleDeleteLibraryIcon(e, icon.filename)}
                              aria-label={`Delete ${icon.filename}`}
                              title="Unused — delete icon"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <label className="form-label">
              <span>Color</span>
              <div className="color-picker">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={`color-swatch ${color === c.value ? 'selected' : ''}`}
                    style={{ background: c.value }}
                    onClick={() => setColor(c.value)}
                    aria-label={c.name}
                  />
                ))}
              </div>
            </label>

            <label className="form-label">
              <span>Tags (comma-separated)</span>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="meme, reaction, funny"
              />
            </label>

            {error && <p className="upload-error">{error}</p>}

            <div className="dialog-actions">
              <button
                type="button"
                className="dialog-button"
                onClick={() => onOpenChange(false)}
                disabled={uploading}
              >
                Cancel
              </button>
              <button type="submit" className="dialog-button primary" disabled={uploading || !file}>
                {uploading ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    Processing...
                  </>
                ) : (
                  'Upload'
                )}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default UploadModal;
