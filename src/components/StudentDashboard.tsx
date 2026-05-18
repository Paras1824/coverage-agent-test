import React from 'react';
import ProgressBar from './ProgressBar';

interface EnrolledCourse {
  id: string;
  title: string;
  progress: number;
  instructor: string;
}

interface StudentDashboardProps {
  studentName: string;
  enrolledCourses: EnrolledCourse[];
  completedCourses: number;
  totalHoursSpent: number;
}

const statCard: React.CSSProperties = {
  background: 'rgba(124,58,237,0.1)',
  border: '1px solid rgba(124,58,237,0.3)',
  borderRadius: 14,
  padding: '18px 20px',
  textAlign: 'center',
  flex: '1 1 120px',
};

const StudentDashboard: React.FC<StudentDashboardProps> = ({
  studentName,
  enrolledCourses,
  completedCourses,
  totalHoursSpent,
}) => {
  const overallProgress =
    enrolledCourses.length === 0
      ? 0
      : Math.round(
          enrolledCourses.reduce((sum, c) => sum + c.progress, 0) / enrolledCourses.length
        );

  return (
    <main
      aria-label={`${studentName}'s Dashboard`}
      style={{
        background: 'linear-gradient(160deg, #0d0d2b 0%, #1a1040 100%)',
        minHeight: '100vh',
        padding: 32,
        color: '#f1f5f9',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <header style={{ marginBottom: 32 }}>
        <p style={{ margin: '0 0 4px', color: '#a78bfa', fontSize: 14 }}>Welcome back 👋</p>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#f1f5f9' }}>
          {studentName}
        </h1>
      </header>

      <section aria-label="Learning statistics" style={{ marginBottom: 32 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
          Your Stats
        </h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={statCard} role="region" aria-label="Enrolled courses">
            <div style={{ fontSize: 28, fontWeight: 800, color: '#7c3aed' }}>{enrolledCourses.length}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Enrolled</div>
          </div>
          <div style={statCard} role="region" aria-label="Completed courses">
            <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b' }}>{completedCourses}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Completed</div>
          </div>
          <div style={statCard} role="region" aria-label="Hours spent learning">
            <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981' }}>{totalHoursSpent}h</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Hours Learned</div>
          </div>
          <div style={statCard} role="region" aria-label="Overall progress">
            <div style={{ fontSize: 28, fontWeight: 800, color: '#a78bfa' }}>{overallProgress}%</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Avg Progress</div>
          </div>
        </div>
      </section>

      <section aria-label="Your courses">
        <h2 style={{ margin: '0 0 16px', fontSize: 16, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
          My Courses
        </h2>
        {enrolledCourses.length === 0 ? (
          <p style={{ color: '#64748b', textAlign: 'center', padding: '40px 0' }}>
            You haven't enrolled in any courses yet.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {enrolledCourses.map((course) => (
              <li
                key={course.id}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(124,58,237,0.2)',
                  borderRadius: 12,
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                }}
              >
                <div style={{ flex: 1 }}>
                  <strong style={{ color: '#f1f5f9', fontSize: 15 }}>{course.title}</strong>
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{course.instructor}</div>
                </div>
                <div style={{ width: 200 }}>
                  <ProgressBar value={course.progress} label={`${course.title} progress`} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
};

export default StudentDashboard;
