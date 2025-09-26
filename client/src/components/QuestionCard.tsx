import React from 'react';
import { Question } from '../types';

interface QuestionCardProps {
  question: Question;
  shuffledOptions: string[];
  selectedChoice: string;
  isSubmitted: boolean;
  isRevealed: boolean;
  onChoiceSelect: (choice: string) => void;
  onSubmit: (choice: string) => void;
  onReset?: () => void;
  isStaticQuiz?: boolean;
  timeRemaining?: number;
  currentQuestionIndex?: number;
  totalQuestions?: number;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  shuffledOptions,
  selectedChoice,
  isSubmitted,
  isRevealed,
  onChoiceSelect,
  onSubmit,
  onReset,
  isStaticQuiz = false,
  timeRemaining = 0,
  currentQuestionIndex = 0,
  totalQuestions = 0
}) => {
  const getOptionState = (option: string) => {
    if (!isSubmitted && !isRevealed) {
      return selectedChoice === option ? 'selected' : 'default';
    }
    
    if (isRevealed) {
      if (option === question.answer) return 'correct';
      if (selectedChoice === option && option !== question.answer) return 'incorrect';
      return 'default';
    }
    
    if (isSubmitted) {
      if (option === question.answer) return 'correct';
      if (selectedChoice === option && option !== question.answer) return 'incorrect';
      return 'default';
    }
    
    return 'default';
  };

  const getOptionClasses = (state: string) => {
    const baseClasses = 'w-full p-4 text-left rounded-lg border-2 transition-all duration-200 cursor-pointer';
    
    switch (state) {
      case 'selected':
        return `${baseClasses} border-primary-500 bg-primary-50 text-primary-700`;
      case 'correct':
        return `${baseClasses} border-success-500 bg-success-50 text-success-700`;
      case 'incorrect':
        return `${baseClasses} border-danger-500 bg-danger-50 text-danger-700`;
      default:
        return `${baseClasses} border-gray-300 bg-white text-gray-700 hover:border-primary-300 hover:bg-primary-25`;
    }
  };

  const handleOptionClick = (option: string) => {
    if (isSubmitted) return;
    
    onChoiceSelect(option);
    // For Static Quiz, don't auto-submit, let user choose
    if (!isStaticQuiz) {
      onSubmit(option);
    }
  };

  const handleSaveAndNext = () => {
    if (selectedChoice && !isSubmitted) {
      onSubmit(selectedChoice);
    }
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center space-x-2">
            <div className="text-sm text-gray-500">
              Question {question.index}
            </div>
            <div className="text-xs">
              {isStaticQuiz ? '📚' : '🎯'}
            </div>
            {isStaticQuiz && totalQuestions > 0 && (
              <div className="text-xs text-gray-400">
                ({currentQuestionIndex}/{totalQuestions})
              </div>
            )}
          </div>
          {isStaticQuiz && timeRemaining > 0 && (
            <div className="text-sm font-medium text-primary-600">
              Time: {timeRemaining}s
            </div>
          )}
        </div>
        <h2 className="text-xl font-semibold text-gray-800 leading-relaxed">
          {question.text}
        </h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {shuffledOptions.map((option, index) => {
          const state = getOptionState(option);
          const classes = getOptionClasses(state);
          
          return (
            <button
              key={index}
              className={classes}
              onClick={() => handleOptionClick(option)}
              disabled={isSubmitted}
            >
              <div className="flex items-center">
                <div className="w-6 h-6 rounded-full border-2 border-current mr-3 flex items-center justify-center text-sm font-bold">
                  {String.fromCharCode(65 + index)}
                </div>
                <span className="flex-1">{option}</span>
                {state === 'correct' && <span className="text-success-600 ml-2">✓</span>}
                {state === 'incorrect' && <span className="text-danger-600 ml-2">✗</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Static Quiz Controls */}
      {isStaticQuiz && (
        <div className="mt-6 flex justify-between items-center">
          <button
            onClick={handleReset}
            disabled={!selectedChoice || isSubmitted}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Reset Response
          </button>
          
          <button
            onClick={handleSaveAndNext}
            disabled={!selectedChoice || isSubmitted}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Save & Next →
          </button>
        </div>
      )}
    </div>
  );
};
