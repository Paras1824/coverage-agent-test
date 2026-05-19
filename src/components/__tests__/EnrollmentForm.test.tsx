import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EnrollmentForm from '../EnrollmentForm';

const courses = [
  { id: 'c-1', title: 'React Fundamentals' },
  { id: 'c-2', title: 'TypeScript Deep Dive' },
];

describe('EnrollmentForm', () => {
  it('renders the form with all fields', () => {
    render(<EnrollmentForm courses={courses} onSubmit={jest.fn()} />);
    expect(screen.getByRole('heading', { name: 'Enroll in a Course' })).toBeInTheDocument();
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Course')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enroll Now →' })).toBeInTheDocument();
  });

  it('renders course options in the select', () => {
    render(<EnrollmentForm courses={courses} onSubmit={jest.fn()} />);
    expect(screen.getByRole('option', { name: 'React Fundamentals' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'TypeScript Deep Dive' })).toBeInTheDocument();
  });

  it('shows error when name is empty on submit', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<EnrollmentForm courses={courses} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Enroll Now →' }));
    expect(screen.getByText('Full name is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows error when email is empty on submit', async () => {
    const user = userEvent.setup();
    render(<EnrollmentForm courses={courses} onSubmit={jest.fn()} />);
    await user.type(screen.getByLabelText('Full Name'), 'Alice');
    await user.click(screen.getByRole('button', { name: 'Enroll Now →' }));
    expect(screen.getByText('Email is required')).toBeInTheDocument();
  });

  it('shows error when email format is invalid', async () => {
    const user = userEvent.setup();
    render(<EnrollmentForm courses={courses} onSubmit={jest.fn()} />);
    await user.type(screen.getByLabelText('Full Name'), 'Alice');
    await user.type(screen.getByLabelText('Email Address'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Enroll Now →' }));
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
  });

  it('shows error when no course is selected', async () => {
    const user = userEvent.setup();
    render(<EnrollmentForm courses={courses} onSubmit={jest.fn()} />);
    await user.type(screen.getByLabelText('Full Name'), 'Alice');
    await user.type(screen.getByLabelText('Email Address'), 'alice@example.com');
    await user.click(screen.getByRole('button', { name: 'Enroll Now →' }));
    expect(screen.getByText('Please select a course')).toBeInTheDocument();
  });

  it('submits with correct data when all fields are valid', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<EnrollmentForm courses={courses} onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('Full Name'), 'Alice');
    await user.type(screen.getByLabelText('Email Address'), 'alice@example.com');
    await user.selectOptions(screen.getByLabelText('Select Course'), 'c-2');
    await user.click(screen.getByRole('button', { name: 'Enroll Now →' }));
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Alice',
      email: 'alice@example.com',
      courseId: 'c-2',
    });
  });

  it('shows success state after successful submission', async () => {
    const user = userEvent.setup();
    render(<EnrollmentForm courses={courses} onSubmit={jest.fn()} />);
    await user.type(screen.getByLabelText('Full Name'), 'Bob');
    await user.type(screen.getByLabelText('Email Address'), 'bob@example.com');
    await user.selectOptions(screen.getByLabelText('Select Course'), 'c-1');
    await user.click(screen.getByRole('button', { name: 'Enroll Now →' }));
    expect(screen.getByRole('status')).toHaveTextContent('Enrollment Successful!');
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
  });

  it('shows "Enrolling..." text when loading', () => {
    render(<EnrollmentForm courses={courses} onSubmit={jest.fn()} loading />);
    const button = screen.getByRole('button', { name: 'Enrolling...' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('clears errors when re-submitting with valid input', async () => {
    const user = userEvent.setup();
    render(<EnrollmentForm courses={courses} onSubmit={jest.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Enroll Now →' }));
    expect(screen.getByText('Full name is required')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Full Name'), 'Alice');
    await user.type(screen.getByLabelText('Email Address'), 'alice@example.com');
    await user.selectOptions(screen.getByLabelText('Select Course'), 'c-1');
    await user.click(screen.getByRole('button', { name: 'Enroll Now →' }));
    expect(screen.queryByText('Full name is required')).not.toBeInTheDocument();
  });
});
