import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchBar from '../components/SearchBar.jsx';

describe('SearchBar', () => {
  it('renders input with placeholder', () => {
    render(<SearchBar value="" onChange={() => {}} />);
    expect(screen.getByPlaceholderText('Search sounds...')).toBeDefined();
  });

  it('displays the current value', () => {
    render(<SearchBar value="yeet" onChange={() => {}} />);
    expect(screen.getByDisplayValue('yeet')).toBeDefined();
  });

  it('calls onChange when typing', () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} />);
    const input = screen.getByLabelText('Search sounds');
    fireEvent.change(input, { target: { value: 'bruh' } });
    expect(onChange).toHaveBeenCalledWith('bruh');
  });
});
