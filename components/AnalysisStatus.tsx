import React from 'react';
import { AppStatus } from '../types';
import type { ValidationResult } from '../types';
import { Loader } from './Loader';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { WarningIcon } from './icons/WarningIcon';
import { useTranslation } from '../i18n';

interface AnalysisStatusProps {
  status: AppStatus;
  result: ValidationResult | null;
  wasRepaired?: boolean;
  apiError?: string | null;
  aiSupportPercent?: number | null;
}

const AnalysisStatus: React.FC<AnalysisStatusProps> = ({ status, result, wasRepaired, apiError, aiSupportPercent }) => {
  const { t } = useTranslation();

  const renderContent = () => {
    switch (status) {
      case AppStatus.ANALYZING:
        return (
          <div className="flex items-center text-gray-600 dark:text-gray-300">
            <Loader />
            <span className="mx-3">{t('status_analyzing')}</span>
          </div>
        );
      case AppStatus.ESTIMATING_SUPPORT:
        return (
          <div className="flex items-center text-gray-600 dark:text-gray-300">
            <Loader />
            <span className="mx-3">{t('status_estimating_support')}</span>
          </div>
        );
      case AppStatus.REPAIRING:
        return (
          <div className="flex items-center text-yellow-600 dark:text-yellow-400">
            <Loader />
            <span className="mx-3">{t('status_repairing')}</span>
          </div>
        );
      case AppStatus.SUCCESS:
        return (
          <div>
            <div className="flex items-center text-green-600 dark:text-green-400 mb-4">
              <CheckCircleIcon className="w-6 h-6" />
              <span className="mx-3 font-semibold">
                {wasRepaired
                  ? t('status_repaired_successfully')
                  : t('status_printable')}
              </span>
            </div>
            
            <div className="mt-4 p-3 rounded-md bg-red-100/50 dark:bg-red-900/30 border border-red-300/50 dark:border-red-500/50 text-red-800 dark:text-red-300 text-sm flex items-start gap-2">
                <div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                </div>
                <p>
                    <span className="font-semibold">{t('support_warning_title')}:</span> {t('support_warning_desc')}
                </p>
            </div>

            {result && (result.dimensions_mm || result.volume_cm3) && (
              <div className="p-3 bg-gray-50 dark:bg-black/20 rounded-md text-sm border border-gray-300 dark:border-gray-700 mt-4">
                <h4 className="font-semibold text-gray-600 dark:text-gray-300 mb-2">{t('model_specs_title')}</h4>
                <div className="space-y-1 font-mono">
                  {result.dimensions_mm && (
                     <div className="flex justify-between items-center">
                        <span className="text-gray-500 dark:text-gray-400">{t('model_specs_dimensions')}:</span>
                        <span className="text-gray-700 dark:text-gray-200 text-right">{`X: ${result.dimensions_mm.x.toFixed(1)}, Y: ${result.dimensions_mm.y.toFixed(1)}, Z: ${result.dimensions_mm.z.toFixed(1)}`}</span>
                    </div>
                  )}
                  {result.volume_cm3 && (
                     <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400">{t('model_specs_volume')}:</span>
                      <span className="text-gray-700 dark:text-gray-200">{result.volume_cm3?.toFixed(2)} cm³</span>
                     </div>
                  )}
                   {aiSupportPercent !== null && (
                     <div className="flex justify-between items-center pt-1 border-t border-gray-200 dark:border-gray-600 mt-1">
                      <span className="text-gray-500 dark:text-gray-400">{t('model_specs_support_estimation')}:</span>
                      <span className="text-gray-700 dark:text-gray-200 font-bold">{aiSupportPercent}%</span>
                     </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      case AppStatus.REPAIR_PROMPT:
        return (
          <div className="text-yellow-800 dark:text-yellow-300">
            <div className="flex items-center font-semibold">
              <WarningIcon className="w-6 h-6" />
              <span className="mx-3">{t('status_repair_prompt')}:</span>
            </div>
            {result?.errors && (
              <ul className="list-disc list-inside mx-9 mt-2 text-sm">
                {result.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            )}
          </div>
        );
      case AppStatus.ERROR:
        return (
          <div className="text-red-800 dark:text-red-400">
            <div className="flex items-center font-semibold">
              <XCircleIcon className="w-6 h-6" />
              <span className="mx-3">{t('status_error')}:</span>
            </div>
             <div className="mx-9 mt-2 text-sm">
                {apiError || (result?.errors && (
                  <ul className="list-disc list-inside">
                    {result.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };
  
  const getContainerClasses = () => {
    switch (status) {
      case AppStatus.REPAIR_PROMPT:
        return "p-4 rounded-lg bg-yellow-100/50 dark:bg-yellow-500/20 border border-yellow-400 dark:border-yellow-500/50";
      case AppStatus.ERROR:
        return "p-4 rounded-lg bg-red-100/50 dark:bg-red-500/20 border border-red-400 dark:border-red-500/50";
      default:
        return "p-4 rounded-lg bg-gray-200/50 dark:bg-gray-800/50";
    }
  }

  return <div className={getContainerClasses()}>{renderContent()}</div>;
};

export default AnalysisStatus;