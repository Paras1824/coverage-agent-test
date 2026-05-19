import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CourseCard, { Course } from '../CourseCard';

const baseCourse: Course = {
  id: 'c-1',
  title: 'React Fundamentals',
  instructor: 'Jane Doe',
  duration: 12,
  level: 'beginner',
  enrolled: 240,
};

describe('CourseCard', () => {
  it('renders course title and instructor', () => {
    render(<CourseCard course={baseCourse} />);
    expect(screen.getByRole('heading', { name: 'React Fundamentals' })).toBeInTheDocument();
    expect(screen.getByText('by Jane Doe')).toBeInTheDocument();
  });

  it('renders the thumbnail image when provided', () => {
    render(<CourseCard course={{ ...baseCourse, thumbnail: 'https://example.com/thumb.png' }} />);
    const img = screen.getByRole('img', { name: 'React Fundamentals thumbnail' });
    expect(img).toHaveAttribute('src', 'https://example.com/thumb.png');
  });

  it('renders fallback initial when no thumbnail is provided', () => {
    render(<CourseCard course={baseCourse} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();
  });

  it('shows the course level badge', () => {
    render(<CourseCard course={{ ...baseCourse, level: 'advanced' }} />);
    expect(screen.getByLabelText('Level: advanced')).toHaveTextContent('advanced');
  });

  it('shows duration in hours', () => {
    render(<CourseCard course={{ ...baseCourse, duration: 8 }} />);
    expect(screen.getByLabelText('Duration: 8 hours')).toBeInTheDocument();
  });

  it('shows enrolled students count', () => {
    render(<CourseCard course={{ ...baseCourse, enrolled: 1024 }} />);
    expect(screen.getByLabelText('1024 students enrolled')).toBeInTheDocument();
  });

  it('calls onEnroll with course id when enroll button is clicked', async () => {
    const user = userEvent.setup();
    const onEnroll = jest.fn();
    render(<CourseCard course={baseCourse} onEnroll={onEnroll} />);
    await user.click(screen.getByRole('button', { name: 'Enroll in React Fundamentals' }));
    expect(onEnroll).toHaveBeenCalledWith('c-1');
    expect(onEnroll).toHaveBeenCalledTimes(1);
  });

  it('disables the button when isEnrolled is true', () => {
    render(<CourseCard course={baseCourse} isEnrolled />);
    const button = screen.getByRole('button', { name: 'Already enrolled in React Fundamentals' });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('✓ Enrolled');
  });

  it('does not call onEnroll when button is disabled', async () => {
    const user = userEvent.setup();
    const onEnroll = jest.fn();
    render(<CourseCard course={baseCourse} onEnroll={onEnroll} isEnrolled />);
    await user.click(screen.getByRole('button', { name: 'Already enrolled in React Fundamentals' }));
    expect(onEnroll).not.toHaveBeenCalled();
  });

  it('does not throw when onEnroll is omitted', async () => {
    const user = userEvent.setup();
    render(<CourseCard course={baseCourse} />);
    await user.click(screen.getByRole('button', { name: 'Enroll in React Fundamentals' }));
    expect(screen.getByRole('button', { name: 'Enroll in React Fundamentals' })).toBeInTheDocument();
  });
});
