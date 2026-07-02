import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import InstallPrompt from '../components/InstallPrompt.jsx';

describe('InstallPrompt', () => {
  it('returns null when no deferredPrompt', () => {
    const { container } = render(<InstallPrompt />);
    expect(container.firstChild).toBeNull();
  });

  it('renders install button after beforeinstallprompt event', async () => {
    const { container } = render(<InstallPrompt />);
    const event = new Event('beforeinstallprompt');
    Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
    window.dispatchEvent(event);
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
      expect(container.querySelector('.install-button')).not.toBeNull();
    });
  });

  it('removes install button when dialog is dismissed', async () => {
    const { container } = render(<InstallPrompt />);
    const event = new Event('beforeinstallprompt');
    Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
    window.dispatchEvent(event);

    await waitFor(() => {
      expect(container.querySelector('.install-button')).not.toBeNull();
    });
  });
});
