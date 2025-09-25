import React from 'react';
import { useTranslation } from '../i18n';

interface OrientationControlProps {
  setRotation: React.Dispatch<React.SetStateAction<[number, number, number]>>;
}

const RotationButton: React.FC<{onClick: () => void, children: React.ReactNode}> = ({onClick, children}) => (
    <button onClick={onClick} className="w-full text-sm bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-2 px-2 rounded-md transition-colors">
        {children}
    </button>
);

const OrientationControl: React.FC<OrientationControlProps> = ({ setRotation }) => {
    const { t } = useTranslation();
    const rotate = (axis: 'x' | 'y' | 'z', angle: number) => {
        setRotation(prev => {
            const newRotation = [...prev] as [number, number, number];
            if (axis === 'x') newRotation[0] += angle;
            if (axis === 'y') newRotation[1] += angle;
            if (axis === 'z') newRotation[2] += angle;
            return newRotation;
        });
    };

    const resetRotation = () => {
        setRotation([0, 0, 0]);
    };

    const angle = Math.PI / 4; // 45 degrees

    return (
        <div className="p-4 rounded-lg bg-gray-200/50 dark:bg-gray-800/50">
            <h3 className="font-bold text-lg mb-3 text-gray-600 dark:text-gray-300">{t('manual_orientation_title')}</h3>
            <div className="grid grid-cols-3 gap-2">
                {/* X Axis */}
                <RotationButton onClick={() => rotate('x', angle)}>+45° X</RotationButton>
                <div className="text-center self-center font-bold text-gray-500 dark:text-gray-400">{t('manual_orientation_axis_x')}</div>
                <RotationButton onClick={() => rotate('x', -angle)}>-45° X</RotationButton>
                
                {/* Y Axis */}
                <RotationButton onClick={() => rotate('y', angle)}>+45° Y</RotationButton>
                <div className="text-center self-center font-bold text-gray-500 dark:text-gray-400">{t('manual_orientation_axis_y')}</div>
                <RotationButton onClick={() => rotate('y', -angle)}>-45° Y</RotationButton>

                {/* Z Axis */}
                <RotationButton onClick={() => rotate('z', angle)}>+45° Z</RotationButton>
                <div className="text-center self-center font-bold text-gray-500 dark:text-gray-400">{t('manual_orientation_axis_z')}</div>
                <RotationButton onClick={() => rotate('z', -angle)}>-45° Z</RotationButton>
            </div>
            <button 
              onClick={resetRotation} 
              className="w-full mt-3 text-sm bg-gray-300 hover:bg-red-200/50 dark:bg-gray-700 dark:hover:bg-red-500/50 text-gray-700 dark:text-gray-200 font-semibold py-2 px-2 rounded-md transition-colors"
            >
                {t('manual_orientation_reset')}
            </button>
        </div>
    );
};

export default OrientationControl;