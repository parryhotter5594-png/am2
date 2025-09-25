import React from 'react';

interface LanguageToggleProps {
  language: 'fa' | 'en';
  toggleLanguage: () => void;
}

const LanguageToggle: React.FC<LanguageToggleProps> = ({ language, toggleLanguage }) => {
  return (
    <button
      onClick={toggleLanguage}
      className="p-2 w-12 text-center font-bold text-gray-500 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-400 transition-colors"
      title={language === 'fa' ? 'Change to English' : 'تغییر به فارسی'}
      aria-label="Toggle language"
    >
      {language === 'fa' ? 'EN' : 'FA'}
    </button>
  );
};

export default LanguageToggle;
