import React from 'react';
import { CheckCircleIcon, CircleIcon, SpinnerIcon } from './Icons';

interface LoadingIndicatorProps {
  stages: string[];
  currentStageIndex: number;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ stages, currentStageIndex }) => {
  return (
    <div className="text-left space-y-4">
      {stages.map((stage, index) => {
        const isCompleted = index < currentStageIndex;
        const isCurrent = index === currentStageIndex;

        let icon;
        let textClass = '';

        if (isCompleted) {
          icon = <CheckCircleIcon className="w-6 h-6 text-green-500" />;
          textClass = 'text-gray-500 dark:text-gray-400 line-through';
        } else if (isCurrent) {
          icon = <SpinnerIcon className="w-6 h-6 text-blue-600" />;
          textClass = 'font-semibold text-blue-600 dark:text-blue-300';
        } else { // isPending
          icon = <CircleIcon className="w-6 h-6 text-gray-300 dark:text-gray-600" />;
          textClass = 'text-gray-400 dark:text-gray-500';
        }
        
        return (
          <div key={index} className="flex items-center space-x-4 animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
            <div className="flex-shrink-0">
                {icon}
            </div>
            <span className={`transition-colors duration-300 ${textClass}`}>
              {stage}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default LoadingIndicator;
