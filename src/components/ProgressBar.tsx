import React from 'react';

interface ProgressBarProps {
  value: number;
  label?: string;
  color?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  label,
  color = '#7c3aed',
}) => {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <span style={{ fontSize: 12, color: '#a78bfa', marginBottom: 4, display: 'block' }}>
          {label}
        </span>
      )}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 8,
          height: 8,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${clamped}%`,
            background: `linear-gradient(90deg, ${color}, #f59e0b)`,
            height: '100%',
            borderRadius: 8,
            transition: 'width 0.4s ease',
            boxShadow: `0 0 8px ${color}80`,
          }}
        />
      </div>
      <span style={{ fontSize: 12, color: '#e2e8f0', marginTop: 4, display: 'block', textAlign: 'right' }}>
        {clamped}%
      </span>
    </div>
  );
};

export default ProgressBar;
