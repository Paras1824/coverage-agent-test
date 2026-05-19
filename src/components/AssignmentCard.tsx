import React, { useState } from 'react';

type AssignmentStatus = 'pending' | 'submitted' | 'graded' | 'overdue';
type Priority = 'low' | 'medium' | 'high';

export interface Assignment {
  id: string;
  title: string;
  courseTitle: string;
  dueDate: string;
  status: AssignmentStatus;
  priority: Priority;
  grade?: number;
  maxGrade?: number;
  description?: string;
}

interface AssignmentCardProps {
  assignment: Assignment;
  onSubmit: (id: string, text: string) => void;
  onViewFeedback?: (id: string) => void;
}

const statusColor: Record<AssignmentStatus, string> = {
  pending: '#f59e0b',
  submitted: '#0ea5e9',
  graded: '#10b981',
  overdue: '#ef4444',
};

const priorityLabel: Record<Priority, string> = {
  low: 'Low Priority',
  medium: 'Medium Priority',
  high: 'High Priority',
};

const priorityColor: Record<Priority, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
};

const AssignmentCard: React.FC<AssignmentCardProps> = ({ assignment, onSubmit, onViewFeedback }) => {
  const [expanded, setExpanded] = useState(false);
  const [submissionText, setSubmissionText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isOverdue = assignment.status === 'overdue';
  const isGraded = assignment.status === 'graded';
  const canSubmit = assignment.status === 'pending' || assignment.status === 'overdue';

  const handleSubmit = () => {
    if (!submissionText.trim()) return;
    setSubmitting(true);
    onSubmit(assignment.id, submissionText);
    setSubmitting(false);
    setSubmissionText('');
  };

  const daysUntilDue = () => {
    const due = new Date(assignment.dueDate);
    const now = new Date();
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `${Math.abs(diff)} days overdue`;
    if (diff === 0) return 'Due today';
    return `Due in ${diff} days`;
  };

  return (
    <article
      aria-label={`Assignment: ${assignment.title}`}
      style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #13133a 100%)',
        border: `1px solid ${isOverdue ? '#ef444455' : 'rgba(124,58,237,0.3)'}`,
        borderRadius: 16,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 4px', color: '#f1f5f9', fontSize: 16, fontWeight: 700 }}>
            {assignment.title}
          </h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: 12 }}>{assignment.courseTitle}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <span
            aria-label={`Status: ${assignment.status}`}
            style={{
              background: `${statusColor[assignment.status]}22`,
              color: statusColor[assignment.status],
              border: `1px solid ${statusColor[assignment.status]}55`,
              borderRadius: 20,
              padding: '2px 10px',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            {assignment.status}
          </span>
          <span
            aria-label={priorityLabel[assignment.priority]}
            style={{ color: priorityColor[assignment.priority], fontSize: 11, fontWeight: 600 }}
          >
            ● {priorityLabel[assignment.priority]}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <span
          aria-label={daysUntilDue()}
          style={{ color: isOverdue ? '#ef4444' : '#94a3b8', fontSize: 12 }}
        >
          🗓 {daysUntilDue()}
        </span>
        {isGraded && assignment.grade !== undefined && (
          <span
            aria-label={`Grade: ${assignment.grade} out of ${assignment.maxGrade ?? 100}`}
            style={{ color: '#10b981', fontSize: 12, fontWeight: 700 }}
          >
            🏆 {assignment.grade}/{assignment.maxGrade ?? 100}
          </span>
        )}
      </div>

      {assignment.description && (
        <p style={{ margin: 0, color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>
          {assignment.description}
        </p>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {canSubmit && (
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls={`submission-${assignment.id}`}
            style={{
              padding: '8px 16px',
              background: expanded ? 'rgba(124,58,237,0.2)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)',
              border: expanded ? '1px solid #7c3aed55' : 'none',
              borderRadius: 8,
              color: '#fff',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {expanded ? 'Hide submission' : 'Submit Work'}
          </button>
        )}
        {isGraded && onViewFeedback && (
          <button
            onClick={() => onViewFeedback(assignment.id)}
            aria-label={`View feedback for ${assignment.title}`}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid rgba(16,185,129,0.4)',
              borderRadius: 8,
              color: '#10b981',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            View Feedback
          </button>
        )}
      </div>

      {expanded && canSubmit && (
        <div id={`submission-${assignment.id}`} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label htmlFor={`text-${assignment.id}`} style={{ color: '#a78bfa', fontSize: 13, fontWeight: 600 }}>
            Your submission
          </label>
          <textarea
            id={`text-${assignment.id}`}
            value={submissionText}
            onChange={(e) => setSubmissionText(e.target.value)}
            placeholder="Write or paste your submission here..."
            rows={4}
            style={{
              width: '100%',
              padding: '12px 14px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(124,58,237,0.3)',
              borderRadius: 10,
              color: '#f1f5f9',
              fontSize: 13,
              resize: 'vertical',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!submissionText.trim() || submitting}
            aria-label="Submit assignment"
            style={{
              padding: '10px 20px',
              background: submissionText.trim() ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'rgba(124,58,237,0.2)',
              border: 'none',
              borderRadius: 8,
              color: submissionText.trim() ? '#fff' : '#6b7280',
              fontWeight: 700,
              cursor: submissionText.trim() ? 'pointer' : 'not-allowed',
              alignSelf: 'flex-end',
            }}
          >
            {submitting ? 'Submitting...' : 'Submit →'}
          </button>
        </div>
      )}
    </article>
  );
};

export default AssignmentCard;
