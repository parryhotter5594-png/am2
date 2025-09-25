import React, { useState } from 'react';
import { useTranslation } from '../i18n';

interface LoginModalProps {
  correctPassword: string;
  onLoginSuccess: () => void;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ correctPassword, onLoginSuccess, onClose }) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (password === correctPassword) {
      onLoginSuccess();
    } else {
      setError(t('login_error'));
      setPassword('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-gray-100 dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-sm flex flex-col border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100">
        <header className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-teal-600 dark:text-teal-400">{t('login_title')}</h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white">&times;</button>
        </header>
        <main className="p-6 space-y-4">
            <div>
                <label htmlFor="admin-password" className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('login_password_label')}</label>
                <input
                    id="admin-password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                    }}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="w-full p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-teal-500 dark:focus:border-teal-400 outline-none"
                />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
        </main>
        <footer className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
            <button onClick={handleLogin} className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-6 rounded">{t('login_button')}</button>
        </footer>
      </div>
    </div>
  );
};

export default LoginModal;