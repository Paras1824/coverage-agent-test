import React, { useState } from 'react';

interface LeaderboardEntry {
  rank: number;
  studentId: string;
  name: string;
  avatar?: string;
  score: number;
  coursesCompleted: number;
  hoursLearned: number;
  streak: number;
  isCurrentUser?: boolean;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  period: 'weekly' | 'monthly' | 'alltime';
  onPeriodChange: (period: 'weekly' | 'monthly' | 'alltime') => void;
  courseTitle?: string;
}

const medalColor: Record<number, string> = {
  1: '#f59e0b',
  2: '#94a3b8',
  3: '#cd7c2f',
};

const Leaderboard: React.FC<LeaderboardProps> = ({
  entries,
  period,
  onPeriodChange,
  courseTitle,
}) => {
  const [expanded, setExpanded] = useState(false);
  const displayEntries = expanded ? entries : entries.slice(0, 5);
  const currentUserEntry = entries.find((e) => e.isCurrentUser);

  const getRankLabel = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const periods: Array<{ key: 'weekly' | 'monthly' | 'alltime'; label: string }> = [
    { key: 'weekly', label: 'This Week' },
    { key: 'monthly', label: 'This Month' },
    { key: 'alltime', label: 'All Time' },
  ];

  return (
    <section
      aria-label={courseTitle ? `Leaderboard for ${courseTitle}` : 'Leaderboard'}
      style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #13133a 100%)',
        border: '1px solid rgba(124,58,237,0.3)',
        borderRadius: 20,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: 18, fontWeight: 800 }}>
          🏆 {courseTitle ? `${courseTitle} Leaderboard` : 'Global Leaderboard'}
        </h3>
        <div style={{ display: 'flex', gap: 6 }}>
          {periods.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onPeriodChange(key)}
              aria-pressed={period === key}
              style={{
                padding: '6px 12px',
                background: period === key ? 'rgba(124,58,237,0.3)' : 'transparent',
                border: `1px solid ${period === key ? '#7c3aed' : 'rgba(124,58,237,0.3)'}`,
                borderRadius: 8,
                color: period === key ? '#a78bfa' : '#64748b',
                fontSize: 12,
                fontWeight: period === key ? 700 : 400,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <p style={{ color: '#64748b', textAlign: 'center', padding: '20px 0' }}>No entries yet.</p>
      ) : (
        <>
          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {displayEntries.map((entry) => (
              <li
                key={entry.studentId}
                aria-label={`Rank ${entry.rank}: ${entry.name}, score ${entry.score}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: entry.isCurrentUser
                    ? 'rgba(124,58,237,0.15)'
                    : entry.rank <= 3
                    ? `${medalColor[entry.rank]}11`
                    : 'rgba(255,255,255,0.03)',
                  border: entry.isCurrentUser
                    ? '1px solid rgba(124,58,237,0.4)'
                    : entry.rank <= 3
                    ? `1px solid ${medalColor[entry.rank]}33`
                    : '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 32,
                    textAlign: 'center',
                    fontSize: entry.rank <= 3 ? 20 : 14,
                    fontWeight: 700,
                    color: entry.rank <= 3 ? medalColor[entry.rank] : '#64748b',
                    flexShrink: 0,
                  }}
                >
                  {getRankLabel(entry.rank)}
                </span>

                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, #7c3aed, #6d28d9)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 14,
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}
                  aria-hidden="true"
                >
                  {entry.avatar
                    ? <img src={entry.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : entry.name.charAt(0)
                  }
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: entry.isCurrentUser ? '#a78bfa' : '#f1f5f9', fontWeight: entry.isCurrentUser ? 700 : 500, fontSize: 14 }}>
                      {entry.name}
                    </span>
                    {entry.isCurrentUser && (
                      <span style={{ fontSize: 10, background: '#7c3aed', color: '#fff', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>
                        YOU
                      </span>
                    )}
                    {entry.streak >= 7 && (
                      <span aria-label={`${entry.streak} day streak`} style={{ fontSize: 12 }}>🔥 {entry.streak}</span>
                    )}
                  </div>
                  <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                    {entry.coursesCompleted} completed · {entry.hoursLearned}h learned
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: entry.rank <= 3 ? medalColor[entry.rank] : '#a78bfa', fontWeight: 800, fontSize: 16 }}>
                    {entry.score.toLocaleString()}
                  </div>
                  <div style={{ color: '#475569', fontSize: 10 }}>XP</div>
                </div>
              </li>
            ))}
          </ol>

          {entries.length > 5 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              style={{
                background: 'transparent',
                border: '1px solid rgba(124,58,237,0.3)',
                borderRadius: 10,
                color: '#a78bfa',
                padding: '10px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {expanded ? 'Show less ↑' : `Show all ${entries.length} students ↓`}
            </button>
          )}

          {currentUserEntry && currentUserEntry.rank > 5 && !expanded && (
            <div style={{ borderTop: '1px dashed rgba(124,58,237,0.2)', paddingTop: 12 }}>
              <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: 11, textAlign: 'center' }}>Your position</p>
              <div
                aria-label={`Your rank: ${currentUserEntry.rank}, score ${currentUserEntry.score}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '10px 16px',
                  borderRadius: 12,
                  background: 'rgba(124,58,237,0.15)',
                  border: '1px solid rgba(124,58,237,0.4)',
                }}
              >
                <span style={{ color: '#64748b', fontSize: 14, fontWeight: 700, width: 32, textAlign: 'center' }}>
                  #{currentUserEntry.rank}
                </span>
                <span style={{ flex: 1, color: '#a78bfa', fontWeight: 700, fontSize: 14 }}>{currentUserEntry.name}</span>
                <span style={{ color: '#a78bfa', fontWeight: 800, fontSize: 16 }}>{currentUserEntry.score.toLocaleString()} XP</span>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default Leaderboard;
