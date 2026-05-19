import React, { useState } from 'react';

export type QuestionType = 'single' | 'multiple';

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestionProps {
  questionId: string;
  questionText: string;
  questionType: QuestionType;
  options: QuizOption[];
  onAnswer: (questionId: string, selectedIds: string[], isCorrect: boolean) => void;
  showFeedback?: boolean;
  disabled?: boolean;
}

const optionBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '14px 18px',
  borderRadius: 12,
  border: '1px solid rgba(124,58,237,0.3)',
  background: 'rgba(255,255,255,0.03)',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  color: '#e2e8f0',
  fontSize: 14,
  listStyle: 'none',
};

const QuizQuestion: React.FC<QuizQuestionProps> = ({
  questionId,
  questionText,
  questionType,
  options,
  onAnswer,
  showFeedback = false,
  disabled = false,
}) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

  const toggleOption = (optionId: string) => {
    if (submitted || disabled) return;
    if (questionType === 'single') {
      setSelected([optionId]);
    } else {
      setSelected((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
      );
    }
  };

  const handleSubmit = () => {
    if (selected.length === 0 || submitted) return;
    const correctIds = options.filter((o) => o.isCorrect).map((o) => o.id);
    const isCorrect =
      correctIds.length === selected.length && correctIds.every((id) => selected.includes(id));
    setSubmitted(true);
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    onAnswer(questionId, selected, isCorrect);
  };

  const handleReset = () => {
    setSelected([]);
    setSubmitted(false);
    setFeedback(null);
  };

  const getOptionStyle = (option: QuizOption): React.CSSProperties => {
    const isSelected = selected.includes(option.id);
    if (!submitted) {
      return {
        ...optionBase,
        border: isSelected
          ? '1px solid #7c3aed'
          : '1px solid rgba(124,58,237,0.3)',
        background: isSelected ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)',
        boxShadow: isSelected ? '0 0 12px rgba(124,58,237,0.2)' : 'none',
      };
    }
    if (showFeedback) {
      if (option.isCorrect) return { ...optionBase, border: '1px solid #10b981', background: 'rgba(16,185,129,0.1)', cursor: 'default' };
      if (isSelected && !option.isCorrect) return { ...optionBase, border: '1px solid #ef4444', background: 'rgba(239,68,68,0.1)', cursor: 'default' };
    }
    return { ...optionBase, opacity: 0.6, cursor: 'default' };
  };

  return (
    <section
      aria-labelledby={`question-${questionId}`}
      style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #13133a 100%)',
        border: '1px solid rgba(124,58,237,0.5)',
        borderRadius: 20,
        padding: 28,
        boxShadow: '0 0 40px rgba(124,58,237,0.2)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Header dots — like the SkillSpring modal */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: i <= 2 ? '#f59e0b' : 'rgba(255,255,255,0.2)',
            }}
          />
        ))}
      </div>

      <h3
        id={`question-${questionId}`}
        style={{ margin: '0 0 8px', color: '#f1f5f9', fontSize: 18, fontWeight: 700, lineHeight: 1.4 }}
      >
        {questionText}
      </h3>

      <p
        style={{ margin: '0 0 20px', color: '#94a3b8', fontSize: 13 }}
        aria-live="polite"
      >
        {questionType === 'single' ? 'Select one answer' : 'Select all that apply'}
      </p>

      <ul
        role={questionType === 'single' ? 'radiogroup' : 'group'}
        aria-labelledby={`question-${questionId}`}
        style={{ padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {options.map((option) => {
          const inputType = questionType === 'single' ? 'radio' : 'checkbox';
          const inputId = `option-${questionId}-${option.id}`;
          const isSelected = selected.includes(option.id);
          const showCorrect = showFeedback && submitted && option.isCorrect;
          const showWrong = showFeedback && submitted && isSelected && !option.isCorrect;

          return (
            <li
              key={option.id}
              style={getOptionStyle(option)}
              onClick={(e) => {
                if ((e.target as HTMLElement).tagName === 'INPUT') return;
                toggleOption(option.id);
              }}
            >
              <input
                type={inputType}
                id={inputId}
                name={questionType === 'single' ? `question-${questionId}` : undefined}
                checked={isSelected}
                onChange={() => toggleOption(option.id)}
                disabled={submitted || disabled}
                style={{ accentColor: '#7c3aed', width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
              />
              <label htmlFor={inputId} style={{ flex: 1, cursor: submitted ? 'default' : 'pointer' }}>
                {option.text}
              </label>
              {showFeedback && submitted && (
                <span
                  aria-hidden="true"
                  style={{
                    fontSize: 16,
                    color: showCorrect ? '#10b981' : showWrong ? '#ef4444' : 'transparent',
                  }}
                >
                  {showCorrect ? '✓' : showWrong ? '✗' : '·'}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={selected.length === 0 || disabled}
          aria-label="Submit answer"
          style={{
            width: '100%',
            padding: '14px 0',
            background:
              selected.length === 0 || disabled
                ? 'rgba(124,58,237,0.2)'
                : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            color: selected.length === 0 || disabled ? '#6b7280' : '#fff',
            border: 'none',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 15,
            cursor: selected.length === 0 || disabled ? 'not-allowed' : 'pointer',
            boxShadow: selected.length > 0 && !disabled ? '0 0 20px rgba(124,58,237,0.4)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          Submit Answer
        </button>
      ) : (
        <div aria-live="assertive" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {showFeedback && feedback && (
            <div
              role="status"
              style={{
                padding: '14px 20px',
                borderRadius: 12,
                background: feedback === 'correct' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${feedback === 'correct' ? '#10b981' : '#ef4444'}55`,
                color: feedback === 'correct' ? '#10b981' : '#ef4444',
                fontWeight: 600,
                fontSize: 15,
                textAlign: 'center',
              }}
            >
              {feedback === 'correct' ? '✅ Correct! Well done.' : '❌ Incorrect. Review and try again.'}
            </div>
          )}
          <button
            onClick={handleReset}
            aria-label="Try this question again"
            style={{
              padding: '12px 0',
              background: 'transparent',
              color: '#a78bfa',
              border: '1px solid rgba(124,58,237,0.4)',
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Try Again
          </button>
        </div>
      )}
    </section>
  );
};

export default QuizQuestion;
