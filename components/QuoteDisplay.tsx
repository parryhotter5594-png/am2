import React from 'react';
import type { QuoteData } from '../types';
import { Loader } from './Loader';
import { useTranslation } from '../i18n';

interface QuoteDisplayProps {
  quote: QuoteData | null;
  isLoading: boolean;
  quantity: number;
  discountAmount: number;
  finalPrice: number;
  totalMaterialCost: number;
  totalMachineCost: number;
  speedAdjustment?: number;
}

const QuoteDisplay: React.FC<QuoteDisplayProps> = ({ quote, isLoading, quantity, discountAmount, finalPrice, totalMaterialCost, totalMachineCost, speedAdjustment = 1 }) => {
  const { t, language } = useTranslation();
  const locale = language === 'fa' ? 'fa-IR' : 'en-US';
  const currency = language === 'fa' ? ` ${t('currency_toman')}` : ` ${t('currency_usd')}`;

  const formatCurrency = (value: number) => {
    if (language === 'fa') {
        return (Math.ceil(value / 100) * 100).toLocaleString(locale);
    }
    return value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  if (!quote && !isLoading) {
    return null;
  }

  if (isLoading) {
    return (
        <div className="p-4 rounded-lg bg-gray-200/50 dark:bg-gray-800/50 flex items-center text-gray-600 dark:text-gray-300">
          <Loader />
          <span className="mx-3">{t('status_quoting')}</span>
        </div>
    );
  }

  if (quote) {
    const speedReductionPercent = Math.round((1 - speedAdjustment) * 100);
    return (
      <div className="bg-gradient-to-br from-teal-500/10 to-blue-500/10 dark:from-teal-500/20 dark:to-blue-500/20 p-6 rounded-lg border border-teal-500/30 dark:border-teal-500/50">
        <h3 className="text-2xl font-bold mb-4 text-center text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-blue-600 dark:from-teal-300 dark:to-blue-400">
          {t('quote_title')}
        </h3>

        {/* --- Per Item Details --- */}
        <div className="space-y-2">
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-2 font-semibold">{t('quote_details_per_item')}</p>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400">{t('quote_estimated_time')}:</span>
            <span className="font-mono font-semibold text-gray-700 dark:text-gray-200">{quote.time}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400">{t('quote_material_usage')}:</span>
            <span className="font-mono font-semibold text-gray-700 dark:text-gray-200">{t('quote_grams', {grams: quote.material})}</span>
          </div>
           <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-300">
                <span>{t('quote_material_cost')}:</span>
                <span className="font-mono">{formatCurrency(quote.material_cost)}{currency}</span>
           </div>
           <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-300">
                <span>{t('quote_machine_time_cost')}:</span>
                <span className="font-mono">{formatCurrency(quote.machine_time_cost)}{currency}</span>
           </div>
        </div>
        
        {/* --- Total Calculation --- */}
        <div className="mt-5 pt-5 border-t-2 border-teal-500/20 dark:border-teal-500/30">
            <h4 className="text-lg font-bold mb-3 text-center text-gray-600 dark:text-gray-300">
                {t('quote_total_calc_for', {quantity})}
            </h4>
            <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                    <span>{t('quote_total_material_cost')}:</span>
                    <span className="font-mono">{formatCurrency(totalMaterialCost)}{currency}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                    <span>{t('quote_total_machine_cost')}:</span>
                    <span className="font-mono">{formatCurrency(totalMachineCost)}{currency}</span>
                </div>
                 {quantity > 1 && (
                    <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 pt-2 border-t border-teal-500/10 dark:border-teal-500/10">
                        <span>{t('quote_price_per_item')}:</span>
                        <span className="font-mono">{formatCurrency(quote.price)}{currency}</span>
                    </div>
                )}
            </div>

            {discountAmount > 0 && (
                <div className="flex justify-between items-center text-green-700 dark:text-green-400 font-semibold mt-3 p-2 rounded-md bg-green-100/50 dark:bg-green-500/20">
                    <span>{t('quote_tiered_discount')}:</span>
                    <span className="font-mono">- {formatCurrency(discountAmount)}{currency}</span>
                </div>
            )}
            
            {speedAdjustment < 1 && (
                 <div className="mt-4 p-2 rounded-md bg-yellow-100/50 dark:bg-yellow-900/30 border border-yellow-300/50 dark:border-yellow-500/50 text-yellow-800 dark:text-yellow-300 text-xs text-center">
                    {t('quote_speed_reduction_notice', { percent: speedReductionPercent })}
                </div>
            )}

            <div className="text-center mt-4">
                <p className="text-gray-500 dark:text-gray-400 text-lg">{t('quote_final_price')}</p>
                <p className="text-4xl font-bold text-gray-800 dark:text-white mt-1">
                    {finalPrice.toLocaleString(locale)}
                    <span className="text-2xl font-normal text-gray-600 dark:text-gray-300">{currency}</span>
                </p>
            </div>
        </div>
      </div>
    );
  }

  return null;
};

export default QuoteDisplay;