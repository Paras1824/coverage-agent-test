import React, { useState } from 'react';

interface GradeEntry {
  id: string;
  title: string;
  category: 'assignment' | 'quiz' | 'project' | 'exam';
  score: number;
  maxScore: number;
  weight: number;
  date: string;
}

interface GradeBookProps {
  studentName: string;
  courseTitle: string;
  entries: GradeEntry[];
}

const categoryColor: Record<GradeEntry['category'], string> = {
  assignment: '#7c3aed',
  quiz: '#f59e0b',
  project: '#0ea5e9',
  exam: '#ef4444',
};

const getLetterGrade = (pct: number): string => {
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 70) return 'C';
  if (pct >= 60) return 'D';
  return 'F';
};

const getGradeColor = (pct: number): string => {
  if (pct >= 80) return '#10b981';
  if (pct >= 60) return '#f59e0b';
  return '#ef4444';
};

const GradeBook: React.FC<GradeBookProps> = ({ studentName, courseTitle, entries }) => {
  const [filter, setFilter] = useState<GradeEntry['category'] | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date');

  const filtered = entries
    .filter((e) => filter === 'all' || e.category === filter)
    .sort((a, b) => {
      if (sortBy === 'score') return (b.score / b.maxScore) - (a.score / a.maxScore);
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  const weightedAverage = entries.reduce((acc, e) => {
    return acc + (e.score / e.maxScore) * 100 * (e.weight / 100);
  }, 0);

  const totalWeight = entries.reduce((acc, e) => acc + e.weight, 0);
  const finalGrade = totalWeight > 0 ? weightedAverage : 0;
  const letterGrade = getLetterGrade(finalGrade);

  const categories: Array<GradeEntry['category'] | 'all'> = ['all', 'assignment', 'quiz', 'project', 'exam'];

  return (
    <section
      aria-label={`Grade book for ${studentName}`}
      style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #13133a 100%)',
        border: '1px solid rgba(124,58,237,0.3)',
        borderRadius: 20,
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, color: '#f1f5f9', fontSize: 20, fontWeight: 800 }}>{courseTitle}</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>{studentName}</p>
        </div>
        <div
          style={{ textAlign: 'center', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 14, padding: '12px 20px' }}
          aria-label={`Final grade: ${finalGrade.toFixed(1)} percent, ${letterGrade}`}
        >
          <div style={{ fontSize: 32, fontWeight: 900, color: getGradeColor(finalGrade), lineHeight: 1 }}>
            {letterGrade}
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{finalGrade.toFixed(1)}%</div>
        </div>
      </header>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            aria-pressed={filter === cat}
            style={{
              padding: '6px 14px',
              background: filter === cat ? (cat === 'all' ? '#7c3aed' : categoryColor[cat as GradeEntry['category']]) : 'transparent',
              border: `1px solid ${filter === cat ? 'transparent' : 'rgba(124,58,237,0.3)'}`,
              borderRadius: 20,
              color: filter === cat ? '#fff' : '#94a3b8',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {cat}
          </button>
        ))}
        <button
          onClick={() => setSortBy((s) => s === 'date' ? 'score' : 'date')}
          aria-label={`Sort by ${sortBy === 'date' ? 'score' : 'date'}`}
          style={{
            marginLeft: 'auto',
            padding: '6px 14px',
            background: 'transparent',
            border: '1px solid rgba(124,58,237,0.3)',
            borderRadius: 20,
            color: '#a78bfa',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Sort: {sortBy}
        </button>
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: '#64748b', textAlign: 'center', padding: '20px 0' }}>No entries for this category.</p>
      ) : (
        <table
          style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}
          aria-label="Grade entries"
        >
          <thead>
            <tr>
              {['Title', 'Category', 'Score', 'Grade', 'Weight', 'Date'].map((h) => (
                <th
                  key={h}
                  style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, textAlign: 'left', borderBottom: '1px solid rgba(124,58,237,0.2)', fontSize: 11, textTransform: 'uppercase' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => {
              const pct = (entry.score / entry.maxScore) * 100;
              return (
                <tr key={entry.id} style={{ borderBottom: '1px solid rgba(124,58,237,0.1)' }}>
                  <td style={{ padding: '12px 12px', color: '#f1f5f9', fontWeight: 600 }}>{entry.title}</td>
                  <td style={{ padding: '12px 12px' }}>
                    <span style={{ color: categoryColor[entry.category], fontWeight: 600, textTransform: 'capitalize' }}>
                      {entry.category}
                    </span>
                  </td>
                  <td style={{ padding: '12px 12px', color: '#94a3b8' }}>{entry.score}/{entry.maxScore}</td>
                  <td style={{ padding: '12px 12px', color: getGradeColor(pct), fontWeight: 700 }}>
                    {pct.toFixed(0)}% ({getLetterGrade(pct)})
                  </td>
                  <td style={{ padding: '12px 12px', color: '#94a3b8' }}>{entry.weight}%</td>
                  <td style={{ padding: '12px 12px', color: '#64748b' }}>{entry.date}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
};

export default GradeBook;
