import React from 'react';

export interface Course {
  id: string;
  title: string;
  instructor: string;
  duration: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  enrolled: number;
  thumbnail?: string;
}

interface CourseCardProps {
  course: Course;
  onEnroll?: (courseId: string) => void;
  isEnrolled?: boolean;
}

const levelColors: Record<Course['level'], string> = {
  beginner: '#10b981',
  intermediate: '#f59e0b',
  advanced: '#ef4444',
};

const card: React.CSSProperties = {
  background: 'linear-gradient(135deg, #1e1b4b 0%, #13133a 100%)',
  border: '1px solid rgba(124,58,237,0.4)',
  borderRadius: 16,
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  boxShadow: '0 0 24px rgba(124,58,237,0.15)',
  transition: 'box-shadow 0.3s ease',
};

const CourseCard: React.FC<CourseCardProps> = ({ course, onEnroll, isEnrolled = false }) => (
  <article style={card} aria-label={`Course: ${course.title}`}>
    {course.thumbnail ? (
      <img
        src={course.thumbnail}
        alt={`${course.title} thumbnail`}
        style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 10 }}
      />
    ) : (
      <div
        aria-hidden="true"
        style={{
          width: '100%',
          height: 140,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #4c1d95, #7c3aed)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 48,
          color: '#fff',
          fontWeight: 700,
        }}
      >
        {course.title.charAt(0)}
      </div>
    )}

    <div>
      <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: 16, fontWeight: 700 }}>{course.title}</h3>
      <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 13 }}>by {course.instructor}</p>
    </div>

    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <span
        style={{
          background: `${levelColors[course.level]}22`,
          color: levelColors[course.level],
          border: `1px solid ${levelColors[course.level]}55`,
          borderRadius: 20,
          padding: '2px 10px',
          fontSize: 12,
          fontWeight: 600,
        }}
        aria-label={`Level: ${course.level}`}
      >
        {course.level}
      </span>
      <span style={{ color: '#94a3b8', fontSize: 12, display: 'flex', alignItems: 'center' }}
        aria-label={`Duration: ${course.duration} hours`}>
        ⏱ {course.duration}h
      </span>
      <span style={{ color: '#94a3b8', fontSize: 12, display: 'flex', alignItems: 'center' }}
        aria-label={`${course.enrolled} students enrolled`}>
        👥 {course.enrolled}
      </span>
    </div>

    <button
      onClick={() => onEnroll?.(course.id)}
      disabled={isEnrolled}
      aria-label={isEnrolled ? `Already enrolled in ${course.title}` : `Enroll in ${course.title}`}
      style={{
        background: isEnrolled
          ? 'rgba(124,58,237,0.2)'
          : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
        color: isEnrolled ? '#a78bfa' : '#fff',
        border: isEnrolled ? '1px solid #7c3aed55' : 'none',
        borderRadius: 10,
        padding: '10px 0',
        fontWeight: 600,
        fontSize: 14,
        cursor: isEnrolled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: isEnrolled ? 'none' : '0 0 16px rgba(124,58,237,0.4)',
      }}
    >
      {isEnrolled ? '✓ Enrolled' : 'Enroll Now'}
    </button>
  </article>
);

export default CourseCard;
