import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuizQuestion, { QuizOption } from '../QuizQuestion';

const singleOptions: QuizOption[] = [
  { id: 'a', text: 'Paris', isCorrect: true },
  { id: 'b', text: 'London', isCorrect: false },
  { id: 'c', text: 'Berlin', isCorrect: false },
];

const multipleOptions: QuizOption[] = [
  { id: 'a', text: 'useState', isCorrect: true },
  { id: 'b', text: 'useEffect', isCorrect: true },
  { id: 'c', text: 'useNothing', isCorrect: false },
];

describe('QuizQuestion', () => {
  it('renders the question text and hint for single choice', () => {
    render(
      <QuizQuestion
        questionId="q1"
        questionText="What is the capital of France?"
        questionType="single"
        options={singleOptions}
        onAnswer={jest.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'What is the capital of France?' })).toBeInTheDocument();
    expect(screen.getByText('Select one answer')).toBeInTheDocument();
  });

  it('renders the multiple choice hint', () => {
    render(
      <QuizQuestion
        questionId="q2"
        questionText="Which are React hooks?"
        questionType="multiple"
        options={multipleOptions}
        onAnswer={jest.fn()}
      />,
    );
    expect(screen.getByText('Select all that apply')).toBeInTheDocument();
  });

  it('renders all options', () => {
    render(
      <QuizQuestion
        questionId="q1"
        questionText="What is the capital of France?"
        questionType="single"
        options={singleOptions}
        onAnswer={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('Paris')).toBeInTheDocument();
    expect(screen.getByLabelText('London')).toBeInTheDocument();
    expect(screen.getByLabelText('Berlin')).toBeInTheDocument();
  });

  it('disables submit button when no option is selected', () => {
    render(
      <QuizQuestion
        questionId="q1"
        questionText="Pick one"
        questionType="single"
        options={singleOptions}
        onAnswer={jest.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeDisabled();
  });

  it('single choice: replaces selection when another option is picked', async () => {
    const user = userEvent.setup();
    render(
      <QuizQuestion
        questionId="q1"
        questionText="Pick one"
        questionType="single"
        options={singleOptions}
        onAnswer={jest.fn()}
      />,
    );
    await user.click(screen.getByLabelText('Paris'));
    expect(screen.getByLabelText('Paris')).toBeChecked();
    await user.click(screen.getByLabelText('London'));
    expect(screen.getByLabelText('London')).toBeChecked();
    expect(screen.getByLabelText('Paris')).not.toBeChecked();
  });

  it('multiple choice: keeps multiple selections', async () => {
    const user = userEvent.setup();
    render(
      <QuizQuestion
        questionId="q2"
        questionText="Pick multiple"
        questionType="multiple"
        options={multipleOptions}
        onAnswer={jest.fn()}
      />,
    );
    await user.click(screen.getByLabelText('useState'));
    await user.click(screen.getByLabelText('useEffect'));
    expect(screen.getByLabelText('useState')).toBeChecked();
    expect(screen.getByLabelText('useEffect')).toBeChecked();
  });

  it('multiple choice: deselects when clicked again', async () => {
    const user = userEvent.setup();
    render(
      <QuizQuestion
        questionId="q2"
        questionText="Pick multiple"
        questionType="multiple"
        options={multipleOptions}
        onAnswer={jest.fn()}
      />,
    );
    await user.click(screen.getByLabelText('useState'));
    expect(screen.getByLabelText('useState')).toBeChecked();
    await user.click(screen.getByLabelText('useState'));
    expect(screen.getByLabelText('useState')).not.toBeChecked();
  });

  it('calls onAnswer with isCorrect=true when correct single answer is submitted', async () => {
    const user = userEvent.setup();
    const onAnswer = jest.fn();
    render(
      <QuizQuestion
        questionId="q1"
        questionText="Pick one"
        questionType="single"
        options={singleOptions}
        onAnswer={onAnswer}
      />,
    );
    await user.click(screen.getByLabelText('Paris'));
    await user.click(screen.getByRole('button', { name: 'Submit answer' }));
    expect(onAnswer).toHaveBeenCalledWith('q1', ['a'], true);
  });

  it('calls onAnswer with isCorrect=false when wrong answer is submitted', async () => {
    const user = userEvent.setup();
    const onAnswer = jest.fn();
    render(
      <QuizQuestion
        questionId="q1"
        questionText="Pick one"
        questionType="single"
        options={singleOptions}
        onAnswer={onAnswer}
      />,
    );
    await user.click(screen.getByLabelText('London'));
    await user.click(screen.getByRole('button', { name: 'Submit answer' }));
    expect(onAnswer).toHaveBeenCalledWith('q1', ['b'], false);
  });

  it('multiple choice: marks correct only when all correct ids are selected', async () => {
    const user = userEvent.setup();
    const onAnswer = jest.fn();
    render(
      <QuizQuestion
        questionId="q2"
        questionText="Pick all React hooks"
        questionType="multiple"
        options={multipleOptions}
        onAnswer={onAnswer}
      />,
    );
    await user.click(screen.getByLabelText('useState'));
    await user.click(screen.getByLabelText('useEffect'));
    await user.click(screen.getByRole('button', { name: 'Submit answer' }));
    expect(onAnswer).toHaveBeenCalledWith('q2', ['a', 'b'], true);
  });

  it('multiple choice: marks incorrect when partial answer is submitted', async () => {
    const user = userEvent.setup();
    const onAnswer = jest.fn();
    render(
      <QuizQuestion
        questionId="q2"
        questionText="Pick all React hooks"
        questionType="multiple"
        options={multipleOptions}
        onAnswer={onAnswer}
      />,
    );
    await user.click(screen.getByLabelText('useState'));
    await user.click(screen.getByRole('button', { name: 'Submit answer' }));
    expect(onAnswer).toHaveBeenCalledWith('q2', ['a'], false);
  });

  it('shows correct feedback message when showFeedback is true', async () => {
    const user = userEvent.setup();
    render(
      <QuizQuestion
        questionId="q1"
        questionText="Pick one"
        questionType="single"
        options={singleOptions}
        onAnswer={jest.fn()}
        showFeedback
      />,
    );
    await user.click(screen.getByLabelText('Paris'));
    await user.click(screen.getByRole('button', { name: 'Submit answer' }));
    expect(screen.getByRole('status')).toHaveTextContent('Correct! Well done.');
  });

  it('shows incorrect feedback message when showFeedback is true', async () => {
    const user = userEvent.setup();
    render(
      <QuizQuestion
        questionId="q1"
        questionText="Pick one"
        questionType="single"
        options={singleOptions}
        onAnswer={jest.fn()}
        showFeedback
      />,
    );
    await user.click(screen.getByLabelText('London'));
    await user.click(screen.getByRole('button', { name: 'Submit answer' }));
    expect(screen.getByRole('status')).toHaveTextContent('Incorrect. Review and try again.');
  });

  it('resets selection and feedback when Try Again is clicked', async () => {
    const user = userEvent.setup();
    render(
      <QuizQuestion
        questionId="q1"
        questionText="Pick one"
        questionType="single"
        options={singleOptions}
        onAnswer={jest.fn()}
        showFeedback
      />,
    );
    await user.click(screen.getByLabelText('Paris'));
    await user.click(screen.getByRole('button', { name: 'Submit answer' }));
    expect(screen.getByRole('status')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try this question again' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Paris')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeDisabled();
  });

  it('does not allow selection changes after submitting', async () => {
    const user = userEvent.setup();
    render(
      <QuizQuestion
        questionId="q1"
        questionText="Pick one"
        questionType="single"
        options={singleOptions}
        onAnswer={jest.fn()}
        showFeedback
      />,
    );
    await user.click(screen.getByLabelText('Paris'));
    await user.click(screen.getByRole('button', { name: 'Submit answer' }));
    expect(screen.getByLabelText('Paris')).toBeDisabled();
  });

  it('does not respond to clicks when disabled prop is set', async () => {
    const user = userEvent.setup();
    const onAnswer = jest.fn();
    render(
      <QuizQuestion
        questionId="q1"
        questionText="Pick one"
        questionType="single"
        options={singleOptions}
        onAnswer={onAnswer}
        disabled
      />,
    );
    await user.click(screen.getByLabelText('Paris'));
    expect(screen.getByLabelText('Paris')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeDisabled();
  });
});
