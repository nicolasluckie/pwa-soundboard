import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import PreloadModal from '../components/PreloadModal.jsx';

describe('PreloadModal', () => {
  it('returns null when not visible', () => {
    const { container } = render(<PreloadModal visible={false} count={0} total={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders progress bar when visible transitions to true', async () => {
    const { container, rerender } = render(<PreloadModal visible={false} count={0} total={0} />);
    rerender(<PreloadModal visible={true} count={5} total={10} />);
    await waitFor(() => {
      expect(container.querySelector('.progress-bar-fill')).not.toBeNull();
    });
  });

  it('shows 50% width at half progress', async () => {
    const { container, rerender } = render(<PreloadModal visible={false} count={0} total={0} />);
    rerender(<PreloadModal visible={true} count={5} total={10} />);
    await waitFor(() => {
      const fill = container.querySelector('.progress-bar-fill');
      expect(fill).not.toBeNull();
      expect(fill.style.width).toBe('50%');
    });
  });

  it('shows 0% when total is 0', async () => {
    const { container, rerender } = render(<PreloadModal visible={false} count={0} total={0} />);
    rerender(<PreloadModal visible={true} count={0} total={0} />);
    await waitFor(() => {
      const fill = container.querySelector('.progress-bar-fill');
      expect(fill).not.toBeNull();
      expect(fill.style.width).toBe('0%');
    });
  });
});
