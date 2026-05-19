import React from 'react';
import { render, screen } from '@testing-library/react';
import StudentDashboard from '../StudentDashboard';

const courses = [
  { id: 'c-1', title: 'React Fundamentals', progress: 80, instructor: 'Jane Doe' },
  { id: 'c-2', title: 'TypeScript Deep Dive', progress: 40, instructor: 'John Smith' },
];

describe('StudentDashboard', () => {
  it('greets the student by name', () => {
    render(
      <StudentDashboard
        studentName="Alice"
        enrolledCourses={courses}
        completedCourses={3}
        totalHoursSpent={42}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Alice' })).toBeInTheDocument();
    expect(screen.getByText('Welcome back 👋')).toBeInTheDocument();
  });

  it('shows enrolled count from the courses array', () => {
    render(
      <StudentDashboard
        studentName="Alice"
        enrolledCourses={courses}
        completedCourses={3}
        totalHoursSpent={42}
      />,
    );
    const enrolled = screen.getByRole('region', { name: 'Enrolled courses' });
    expect(enrolled).toHaveTextContent('2');
    expect(enrolled).toHaveTextContent('Enrolled');
  });

  it('shows completed courses count', () => {
    render(
      <StudentDashboard
        studentName="Alice"
        enrolledCourses={courses}
        completedCourses={5}
        totalHoursSpent={42}
      />,
    );
    const completed = screen.getByRole('region', { name: 'Completed courses' });
    expect(completed).toHaveTextContent('5');
    expect(completed).toHaveTextContent('Completed');
  });

  it('shows total hours spent', () => {
    render(
      <StudentDashboard
        studentName="Alice"
        enrolledCourses={courses}
        completedCourses={3}
        totalHoursSpent={120}
      />,
    );
    const hours = screen.getByRole('region', { name: 'Hours spent learning' });
    expect(hours).toHaveTextContent('120h');
  });

  it('computes average progress across enrolled courses', () => {
    render(
      <StudentDashboard
        studentName="Alice"
        enrolledCourses={courses}
        completedCourses={3}
        totalHoursSpent={42}
      />,
    );
    const avg = screen.getByRole('region', { name: 'Overall progress' });
    expect(avg).toHaveTextContent('60%');
  });

  it('shows 0% average progress when no courses are enrolled', () => {
    render(
      <StudentDashboard
        studentName="Alice"
        enrolledCourses={[]}
        completedCourses={0}
        totalHoursSpent={0}
      />,
    );
    const avg = screen.getByRole('region', { name: 'Overall progress' });
    expect(avg).toHaveTextContent('0%');
  });

  it('shows empty state message when no courses are enrolled', () => {
    render(
      <StudentDashboard
        studentName="Alice"
        enrolledCourses={[]}
        completedCourses={0}
        totalHoursSpent={0}
      />,
    );
    expect(screen.getByText("You haven't enrolled in any courses yet.")).toBeInTheDocument();
  });

  it('renders a list item per enrolled course with title and instructor', () => {
    render(
      <StudentDashboard
        studentName="Alice"
        enrolledCourses={courses}
        completedCourses={3}
        totalHoursSpent={42}
      />,
    );
    expect(screen.getByText('React Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('TypeScript Deep Dive')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('renders a ProgressBar for each enrolled course', () => {
    render(
      <StudentDashboard
        studentName="Alice"
        enrolledCourses={courses}
        completedCourses={3}
        totalHoursSpent={42}
      />,
    );
    expect(
      screen.getByRole('progressbar', { name: 'React Fundamentals progress' }),
    ).toHaveAttribute('aria-valuenow', '80');
    expect(
      screen.getByRole('progressbar', { name: 'TypeScript Deep Dive progress' }),
    ).toHaveAttribute('aria-valuenow', '40');
  });

  it('has main landmark labelled with the student dashboard name', () => {
    render(
      <StudentDashboard
        studentName="Alice"
        enrolledCourses={courses}
        completedCourses={3}
        totalHoursSpent={42}
      />,
    );
    expect(screen.getByRole('main', { name: "Alice's Dashboard" })).toBeInTheDocument();
  });
});
