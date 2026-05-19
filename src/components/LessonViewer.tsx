import React, { useState } from 'react';

interface Lesson {
  id: string;
  title: string;
  duration: number;
  type: 'video' | 'reading' | 'quiz';
  completed: boolean;
  content?: string;
}

interface LessonViewerProps {
  lessons: Lesson[];
  courseTitle: string;
  onComplete: (lessonId: string) => void;
  onNext: () => void;
  onPrev: () => void;
}

const typeIcon: Record<Lesson['type'], string> = {
  video: '▶',
  reading: '📄',
  quiz: '✏️',
};

const typeColor: Record<Lesson['type'], string> = {
  video: '#7c3aed',
  reading: '#0ea5e9',
  quiz: '#f59e0b',
};

const LessonViewer: React.FC<LessonViewerProps> = ({
  lessons,
  courseTitle,
  onComplete,
  onNext,
  onPrev,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = lessons[activeIndex];
  const completedCount = lessons.filter((l) => l.completed).length;
  const progress = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  if (!active) {
    return (
      <div role="status" style={{ color: '#94a3b8', textAlign: 'center', padding: 40 }}>
        No lessons available.
      </div>
    );
  }

  return (
    <div
      aria-label={`Lesson viewer for ${courseTitle}`}
      style={{
        display: 'flex',
        gap: 0,
        background: 'linear-gradient(135deg, #0d0d2b, #1a1040)',
        borderRadius: 20,
        overflow: 'hidden',
        border: '1px solid rgba(124,58,237,0.3)',
        minHeight: 500,
      }}
    >
      <nav
        aria-label="Lesson list"
        style={{
          width: 260,
          background: 'rgba(0,0,0,0.3)',
          borderRight: '1px solid rgba(124,58,237,0.2)',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          overflowY: 'auto',
        }}
      >
        <p style={{ color: '#a78bfa', fontSize: 12, fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>
          {completedCount}/{lessons.length} completed
        </p>
        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Course progress"
          style={{ height: 4, background: 'rgba(124,58,237,0.2)', borderRadius: 2, marginBottom: 12 }}
        >
          <div style={{ height: '100%', width: `${progress}%`, background: '#7c3aed', borderRadius: 2, transition: 'width 0.3s' }} />
        </div>
        {lessons.map((lesson, i) => (
          <button
            key={lesson.id}
            onClick={() => setActiveIndex(i)}
            aria-current={i === activeIndex ? 'true' : undefined}
            aria-label={`${lesson.title}${lesson.completed ? ', completed' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 10,
              border: i === activeIndex ? '1px solid #7c3aed' : '1px solid transparent',
              background: i === activeIndex ? 'rgba(124,58,237,0.15)' : 'transparent',
              color: lesson.completed ? '#10b981' : '#e2e8f0',
              fontSize: 13,
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <span style={{ color: typeColor[lesson.type], fontSize: 14 }}>{typeIcon[lesson.type]}</span>
            <span style={{ flex: 1 }}>{lesson.title}</span>
            {lesson.completed && <span aria-hidden="true">✓</span>}
          </button>
        ))}
      </nav>

      <main style={{ flex: 1, padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <header>
          <span style={{ fontSize: 12, color: typeColor[active.type], fontWeight: 700, textTransform: 'uppercase' }}>
            {typeIcon[active.type]} {active.type} · {active.duration} min
          </span>
          <h2 style={{ margin: '8px 0 0', color: '#f1f5f9', fontSize: 22, fontWeight: 800 }}>{active.title}</h2>
        </header>

        <div
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(124,58,237,0.2)',
            borderRadius: 12,
            padding: 24,
            color: '#94a3b8',
            fontSize: 15,
            lineHeight: 1.7,
          }}
        >
          {active.content || 'Lesson content will appear here.'}
        </div>

        <footer style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
          <button
            onClick={onPrev}
            disabled={activeIndex === 0}
            aria-label="Previous lesson"
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: '1px solid rgba(124,58,237,0.4)',
              borderRadius: 10,
              color: '#a78bfa',
              cursor: activeIndex === 0 ? 'not-allowed' : 'pointer',
              opacity: activeIndex === 0 ? 0.4 : 1,
              fontWeight: 600,
            }}
          >
            ← Previous
          </button>
          {!active.completed && (
            <button
              onClick={() => onComplete(active.id)}
              aria-label={`Mark ${active.title} as complete`}
              style={{
                padding: '12px 28px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                borderRadius: 10,
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 0 16px rgba(16,185,129,0.3)',
              }}
            >
              Mark Complete ✓
            </button>
          )}
          <button
            onClick={onNext}
            disabled={activeIndex === lessons.length - 1}
            aria-label="Next lesson"
            style={{
              padding: '12px 24px',
              background: activeIndex < lessons.length - 1 ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'transparent',
              border: activeIndex < lessons.length - 1 ? 'none' : '1px solid rgba(124,58,237,0.4)',
              borderRadius: 10,
              color: '#fff',
              cursor: activeIndex === lessons.length - 1 ? 'not-allowed' : 'pointer',
              opacity: activeIndex === lessons.length - 1 ? 0.4 : 1,
              fontWeight: 700,
            }}
          >
            Next →
          </button>
        </footer>
      </main>
    </div>
  );
};

export default LessonViewer;
