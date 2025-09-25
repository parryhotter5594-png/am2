import React, { useRef, useCallback, useState } from 'react';
import { ACCEPTED_FORMATS } from '../constants';
import { UploadIcon } from './icons/UploadIcon';
import { useTranslation } from '../i18n';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  disabled: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, disabled }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);
  
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file && ACCEPTED_FORMATS.split(',').some(format => file.name.toLowerCase().endsWith(format))) {
      onFileSelect(file);
    }
  }, [onFileSelect, disabled]);

  return (
    <div className="flex flex-col items-center">
        <label htmlFor="file-upload" className="font-bold text-lg mb-2 text-gray-600 dark:text-gray-300">
            {t('upload_title')}
        </label>
        <div
            onClick={handleClick}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`w-full h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors duration-300 ${disabled ? 'cursor-not-allowed bg-gray-200/50 dark:bg-gray-800/50 border-gray-400 dark:border-gray-700' : 'cursor-pointer bg-gray-200/50 dark:bg-gray-800/50 border-gray-400 dark:border-gray-700 hover:border-teal-500 dark:hover:border-teal-400 hover:bg-gray-200 dark:hover:bg-gray-800'} ${isDragging ? 'border-teal-500 dark:border-teal-400 bg-gray-200 dark:bg-gray-800' : ''}`}
        >
            <input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                className="hidden"
                accept={ACCEPTED_FORMATS}
                onChange={handleFileChange}
                disabled={disabled}
            />
            <div className="text-center text-gray-500 dark:text-gray-400">
                <UploadIcon className="w-10 h-10 mx-auto mb-2" />
                <p>{t('upload_prompt')}</p>
                <p className="text-sm mt-1">{t('upload_formats')}</p>
            </div>
        </div>
    </div>
  );
};

export default FileUploader;