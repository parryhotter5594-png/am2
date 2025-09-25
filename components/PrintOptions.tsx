import React, { useEffect, useMemo } from 'react';
import { Settings, Material, Option, Color } from '../types';
import { LayerHeightIcon, InfillIcon, WallCountIcon, NozzleIcon } from './icons/SettingIcons';
import { useTranslation } from '../i18n';
import type { TranslationKey } from '../i18n/translations';

interface PrintOptionsProps {
  settings: Settings;
  selectedMaterialId: string;
  onMaterialChange: (id: string) => void;
  selectedNozzleId: string;
  onNozzleChange: (id: string) => void;
  selectedLayerHeight: number;
  onLayerHeightChange: (value: number) => void;
  selectedInfill: number;
  onInfillChange: (value: number) => void;
  selectedWallCount: number;
  onWallCountChange: (value: number) => void;
  selectedColor: string;
  onColorChange: (hex: string) => void;
  availableColors: Color[];
  disabled: boolean;
  dimensions: { x: number, y: number, z: number } | undefined;
}

const SettingRadioGroup = ({ label, options, selectedValue, onChange, disabled, iconType, disabledOptions = [], disabledByNozzle = [] }: {
    label: string;
    options: Option[];
    selectedValue: number;
    onChange: (value: number) => void;
    disabled: boolean;
    iconType: 'layerHeight' | 'infill' | 'wallCount' | 'nozzle';
    disabledOptions?: number[];
    disabledByNozzle?: number[];
}) => {
    const { t } = useTranslation();
    const IconComponent = {
        layerHeight: LayerHeightIcon,
        infill: InfillIcon,
        wallCount: WallCountIcon,
        nozzle: NozzleIcon,
    }[iconType];

    const getTooltip = (optionValue: number, defaultName: string): string => {
        if (disabledByNozzle.includes(optionValue)) return t('tooltip_layer_height_invalid_for_nozzle');
        return defaultName;
    };
    
    return (
        <div>
            <label className="block text-lg font-bold mb-3 text-gray-600 dark:text-gray-300">
                {label}
            </label>
            <div className="grid grid-cols-3 gap-2">
                {options.map((option) => {
                    const isOptionDisabled = disabled || disabledOptions.includes(option.value);
                    const displayName = option.displayNameKey ? t(option.displayNameKey, {value: option.value}) : option.display_name;
                    return (
                        <div key={option.id}>
                            <input
                                type="radio"
                                id={`${label}_${option.id}`}
                                name={label}
                                value={option.value}
                                checked={selectedValue === option.value}
                                onChange={(e) => onChange(parseFloat(e.target.value))}
                                disabled={isOptionDisabled}
                                className="hidden peer"
                            />
                            <label
                                htmlFor={`${label}_${option.id}`}
                                title={isOptionDisabled ? getTooltip(option.value, displayName) : displayName}
                                className={`flex flex-col justify-center items-center p-2 rounded-md border-2 transition-all duration-200 h-24 text-center
                                ${isOptionDisabled 
                                    ? 'bg-gray-200 dark:bg-gray-900 border-gray-300 dark:border-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                                    : 'cursor-pointer bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-700 peer-checked:border-teal-500 dark:peer-checked:border-teal-400 peer-checked:bg-teal-500/10 dark:peer-checked:bg-teal-500/20 peer-checked:text-teal-600 dark:peer-checked:text-teal-300 hover:border-gray-400 dark:hover:border-gray-600'}`
                                }
                            >
                                {IconComponent && <IconComponent value={option.value} className="h-8 w-8 mb-1" />}
                                <span className="font-semibold text-xs sm:text-sm">{displayName}</span>
                            </label>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};


const PrintOptions: React.FC<PrintOptionsProps> = ({
  settings,
  selectedMaterialId,
  onMaterialChange,
  selectedNozzleId,
  onNozzleChange,
  selectedLayerHeight,
  onLayerHeightChange,
  selectedInfill,
  onInfillChange,
  selectedWallCount,
  onWallCountChange,
  selectedColor,
  onColorChange,
  availableColors,
  disabled,
  dimensions
}) => {
  const { t } = useTranslation();
  const { materials, nozzles, layerHeights, infills, wallCounts } = settings;

  const isMaterialDisabled = (material: Material): boolean => {
    if (!dimensions) return false;
    return (
        dimensions.x > material.max_size_mm.x ||
        dimensions.y > material.max_size_mm.y ||
        dimensions.z > material.max_size_mm.z
    );
  };
  
  // Effect to auto-switch material if the current one becomes invalid due to size
  useEffect(() => {
    const selectedMaterial = materials.find(m => m.id === selectedMaterialId);
    if (selectedMaterial && isMaterialDisabled(selectedMaterial)) {
        // Find the first available material that is not disabled
        const firstValidMaterial = materials.find(m => !isMaterialDisabled(m));
        if (firstValidMaterial) {
            onMaterialChange(firstValidMaterial.id);
        }
    }
  }, [dimensions, materials, selectedMaterialId, onMaterialChange]);

  const selectedMaterialIsInvalid = materials.find(m => m.id === selectedMaterialId) ? isMaterialDisabled(materials.find(m => m.id === selectedMaterialId)!) : false;


  // --- Nozzle and Layer Height Compatibility ---
  const disabledLayerHeightValuesByNozzle = useMemo(() => {
    const selectedNozzle = nozzles.find(n => n.id === selectedNozzleId);
    if (!selectedNozzle) {
        return layerHeights.map(lh => lh.value);
    }

    const maxLayerHeight = selectedNozzle.value * 0.75; // Layer height should not exceed 75% of nozzle diameter
    const minLayerHeight = 0.1;

    return layerHeights.filter(lh => lh.value < minLayerHeight || lh.value > maxLayerHeight).map(lh => lh.value);
  }, [selectedNozzleId, nozzles, layerHeights]);


  // Effect to auto-select a valid layer height when nozzle changes
  useEffect(() => {
    if (disabledLayerHeightValuesByNozzle.includes(selectedLayerHeight)) {
        const currentlyAvailable = layerHeights.filter(lh => !disabledLayerHeightValuesByNozzle.includes(lh.value));
        
        if (currentlyAvailable.length > 0) {
            // Find the closest valid layer height to the one that just became invalid
            const sorted = [...currentlyAvailable].sort((a, b) => Math.abs(a.value - selectedLayerHeight) - Math.abs(b.value - selectedLayerHeight));
            onLayerHeightChange(sorted[0].value);
        }
    }
  }, [selectedNozzleId, disabledLayerHeightValuesByNozzle, layerHeights, selectedLayerHeight, onLayerHeightChange]);


  return (
    <div className={`space-y-6 transition-opacity duration-500 ${disabled ? 'opacity-50' : 'opacity-100'}`}>
      {/* Material Selector */}
      <div>
        <label htmlFor="material_selector" className="block text-lg font-bold mb-2 text-gray-600 dark:text-gray-300">
          {t('material_label')}
        </label>
        <select
          id="material_selector"
          value={selectedMaterialId}
          onChange={(e) => onMaterialChange(e.target.value)}
          disabled={disabled}
          className="w-full p-3 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-teal-500 dark:focus:border-teal-400 outline-none transition"
        >
          {materials.map((material) => {
            const isDisabled = isMaterialDisabled(material);
            const name = material.nameKey ? t(material.nameKey) : material.name;
            return (
                <option key={material.id} value={material.id} disabled={isDisabled}>
                  {name} {isDisabled ? `(${t('material_too_large')})` : ''}
                </option>
            )
          })}
        </select>
        {selectedMaterialIsInvalid && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                {t('material_auto_switched')}
            </p>
        )}
      </div>

      {/* Color Selector */}
      <div>
        <label className="block text-lg font-bold mb-2 text-gray-600 dark:text-gray-300">
          {t('color_label')}
        </label>
        <div className="flex flex-wrap items-center gap-3">
          {availableColors.map((color) => {
            const name = color.nameKey ? t(color.nameKey) : color.name;
            return (
                <button
                key={color.id}
                type="button"
                title={name}
                onClick={() => onColorChange(color.hex)}
                disabled={disabled}
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 focus:ring-teal-500 dark:focus:ring-teal-400
                    ${selectedColor === color.hex ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 ring-teal-500 dark:ring-teal-400' : 'border-transparent'}
                    ${disabled ? 'cursor-not-allowed' : 'hover:border-gray-400 dark:hover:border-gray-400'}`}
                style={{ backgroundColor: color.hex }}
                aria-label={`${t('select_color_aria')} ${name}`}
                >
                {selectedColor === color.hex && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white mix-blend-difference" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                )}
                </button>
            )
          })}
        </div>
      </div>
      
      <SettingRadioGroup
        label={t('nozzle_size_label')}
        options={nozzles}
        selectedValue={nozzles.find(n => n.id === selectedNozzleId)?.value || 0}
        onChange={(value) => {
            const nozzle = nozzles.find(n => n.value === value);
            if(nozzle) onNozzleChange(nozzle.id);
        }}
        disabled={disabled}
        iconType="nozzle"
      />

      <SettingRadioGroup
        label={t('layer_height_label')}
        options={layerHeights}
        selectedValue={selectedLayerHeight}
        onChange={onLayerHeightChange}
        disabled={disabled}
        iconType="layerHeight"
        disabledOptions={disabledLayerHeightValuesByNozzle}
        disabledByNozzle={disabledLayerHeightValuesByNozzle}
      />

      <SettingRadioGroup
        label={t('infill_label')}
        options={infills}
        selectedValue={selectedInfill}
        onChange={onInfillChange}
        disabled={disabled}
        iconType="infill"
      />

      <SettingRadioGroup
        label={t('walls_label')}
        options={wallCounts}
        selectedValue={selectedWallCount}
        onChange={onWallCountChange}
        disabled={disabled}
        iconType="wallCount"
      />

    </div>
  );
};

export default PrintOptions;