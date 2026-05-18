import React from 'react';
import { render, screen } from '@testing-library/react';
import ProgressBar from '../ProgressBar';

describe('ProgressBar', () => {
  it('renders with correct aria attributes', () => {
    render(<ProgressBar value={42} label="Course progress" />);
    const bar = screen.getByRole('progressbar', { name: 'Course progress' });
    expect(bar).toHaveAttribute('aria-valuenow', '42');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
  });

  it('displays the percentage value', () => {
    render(<ProgressBar value={75} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('clamps values above 100 to 100', () => {
    render(<ProgressBar value={150} label="Overflow test" />);
    const bar = screen.getByRole('progressbar', { name: 'Overflow test' });
    expect(bar).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('clamps negative values to 0', () => {
    render(<ProgressBar value={-10} label="Underflow test" />);
    const bar = screen.getByRole('progressbar', { name: 'Underflow test' });
    expect(bar).toHaveAttribute('aria-valuenow', '0');
  });

  it('renders label text when provided', () => {
    render(<ProgressBar value={50} label="Module 3" />);
    expect(screen.getByText('Module 3')).toBeInTheDocument();
  });

  it('uses label as aria-label when no label prop is omitted', () => {
    render(<ProgressBar value={30} />);
    expect(screen.getByRole('progressbar', { name: 'Progress' })).toBeInTheDocument();
  });
});
