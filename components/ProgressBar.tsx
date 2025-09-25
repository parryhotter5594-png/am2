import React from 'react';
import { WizardStep } from '../App';
import { CheckIcon } from './icons/CheckIcon';
import { useTranslation } from '../i18n';
// FIX: Import TranslationKey to enforce type safety for i18n keys.
import type { TranslationKey } from '../i18n/translations';

interface ProgressBarProps {
  currentStep: WizardStep;
}

// FIX: Use TranslationKey type for titleKey to match the `t` function's expected argument type.
const stepsConfig: { id: WizardStep, titleKey: TranslationKey }[] = [
  { id: 'UPLOAD', titleKey: 'progress_upload' },
  { id: 'ANALYZE', titleKey: 'progress_analyze' },
  { id: 'OPTIONS', titleKey: 'progress_options' },
  { id: 'QUOTE', titleKey: 'progress_quote' },
];

const stepOrder: WizardStep[] = ['UPLOAD', 'ANALYZE', 'OPTIONS', 'QUOTE'];

const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep }) => {
  const { t } = useTranslation();
  const currentStepIndex = stepOrder.indexOf(currentStep);

  return (
    <div className="w-full px-4 sm:px-0 mb-8">
      <div className="flex items-start">
        {stepsConfig.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center relative">
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10
                    ${isCompleted ? 'bg-teal-500 border-teal-500 text-white' : ''}
                    ${isCurrent ? 'bg-white dark:bg-gray-900 border-teal-500 scale-110' : ''}
                    ${!isCompleted && !isCurrent ? 'bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-700' : ''}
                  `}
                >
                  {isCompleted ? (
                    <CheckIcon className="w-5 h-5" />
                  ) : (
                    <span className={`font-bold text-sm
                      ${isCurrent ? 'text-teal-500' : 'text-gray-500 dark:text-gray-400'}
                    `}>
                      {index + 1}
                    </span>
                  )}
                </div>
                <p className={`mt-2 text-center text-xs sm:text-sm font-semibold transition-colors duration-300 w-20
                    ${isCurrent || isCompleted ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}
                `}>
                  {t(step.titleKey)}
                </p>
              </div>

              {index < stepsConfig.length - 1 && (
                <div className="flex-1 h-1 bg-gray-300 dark:bg-gray-700 mt-4 sm:mt-5 relative">
                   <div
                    className={`h-full bg-teal-500 absolute top-0 right-0 transition-all duration-500 ease-out
                      ${isCompleted ? 'w-full' : 'w-0'}
                      ${isCurrent ? 'w-1/2' : ''}
                    `}
                   />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBar;