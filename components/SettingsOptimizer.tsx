import React from 'react';
import { AppStatus } from '../types';
import { Loader } from './Loader';
import { WandIcon } from './icons/WandIcon';
import { useTranslation } from '../i18n';

interface SuggestedSettings {
    settings: {
        material_id: string;
        nozzle_diameter_mm: number;
        layer_height_mm: number;
        infill_percent: number;
        wall_count: number;
    };
    reasoning: string;
}

interface SettingsOptimizerProps {
  optimizationPrompt: string;
  onOptimizationPromptChange: (value: string) => void;
  onOptimize: () => void;
  onApply: (settings: SuggestedSettings['settings']) => void;
  onIgnore: () => void;
  status: AppStatus;
  suggestion: SuggestedSettings | null;
  apiError: string | null;
}

const SettingsOptimizer: React.FC<SettingsOptimizerProps> = ({
    optimizationPrompt,
    onOptimizationPromptChange,
    onOptimize,
    onApply,
    onIgnore,
    status,
    suggestion,
    apiError
}) => {
  const { t } = useTranslation();
  const isLoading = status === AppStatus.OPTIMIZING_SETTINGS;

  const renderSuggestion = () => {
    if (!suggestion) return null;

    const { settings, reasoning } = suggestion;
    return (
        <div className="mt-4 p-4 rounded-md bg-white/50 dark:bg-black/20 border border-gray-300 dark:border-gray-700 space-y-4">
            <div>
                <h4 className="font-bold text-gray-700 dark:text-gray-200">{t('suggestion_title')}:</h4>
                <ul className="list-disc list-inside mt-2 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <li><span className="font-semibold">{t('material_label')}:</span> {settings.material_id.toUpperCase()}</li>
                    <li><span className="font-semibold">{t('nozzle_size_label')}:</span> {settings.nozzle_diameter_mm}mm</li>
                    <li><span className="font-semibold">{t('layer_height_label')}:</span> {settings.layer_height_mm}mm</li>
                    <li><span className="font-semibold">{t('infill_label')}:</span> {settings.infill_percent}%</li>
                    <li><span className="font-semibold">{t('walls_label')}:</span> {settings.wall_count}</li>
                </ul>
            </div>
            <div>
                <h4 className="font-bold text-gray-700 dark:text-gray-200">{t('suggestion_reasoning')}:</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 italic mt-1">{reasoning}</p>
            </div>
            <div className="flex gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => onApply(settings)}
                    className="flex-1 p-2 text-sm font-bold rounded-md transition-colors duration-200 bg-teal-500 hover:bg-teal-600 text-white"
                >
                    {t('button_apply_settings')}
                </button>
                <button
                    onClick={onIgnore}
                    className="flex-1 p-2 text-sm font-bold rounded-md transition-colors duration-200 bg-gray-500 hover:bg-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 text-white"
                >
                    {t('button_ignore')}
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="p-4 rounded-lg bg-gray-200/50 dark:bg-gray-800/50 border border-indigo-500/20 dark:border-indigo-500/30 mb-6">
        <h3 className="text-lg font-bold mb-3 text-gray-600 dark:text-gray-300 flex items-center gap-2">
            <WandIcon className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
            {t('optimizer_title')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {t('optimizer_desc')}
        </p>
        <textarea
            value={optimizationPrompt}
            onChange={(e) => onOptimizationPromptChange(e.target.value)}
            placeholder={t('optimizer_placeholder')}
            rows={3}
            disabled={isLoading}
            className="w-full p-3 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 outline-none transition disabled:opacity-50"
            aria-label={t('optimizer_aria_label')}
        />
        <button
            onClick={onOptimize}
            disabled={!optimizationPrompt || isLoading}
            className={`w-full flex items-center justify-center mt-3 p-2 font-bold rounded-md transition-colors duration-200 ${
                !optimizationPrompt || isLoading
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
        >
            {isLoading ? <Loader /> : t('button_get_suggestions')}
        </button>

        {apiError && !isLoading && (
            <p className="text-red-500 dark:text-red-400 text-sm text-center pt-2">{apiError}</p>
        )}

        {renderSuggestion()}
    </div>
  );
};

export default SettingsOptimizer;