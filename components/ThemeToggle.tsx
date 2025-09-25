import React from 'react';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, toggleTheme }) => {
  return (
    <button
      onClick={toggleTheme}
      className="p-2 text-gray-500 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-400 transition-colors"
      title={theme === 'dark' ? 'تغییر به حالت روز' : 'تغییر به حالت شب'}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <SunIcon className="w-8 h-8" />
      ) : (
        <MoonIcon className="w-8 h-8" />
      )}
    </button>
  );
};

export default ThemeToggle;
