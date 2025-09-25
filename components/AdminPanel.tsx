import React, { useState } from 'react';
import { Settings, Material, Option, PricingTier, Color } from '../types';
import { DEFAULT_SETTINGS } from '../settings';
import { PREDEFINED_COLORS } from '../constants';
import { useTranslation } from '../i18n';

interface AdminPanelProps {
  currentSettings: Settings;
  onSave: (newSettings: Settings) => void;
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ currentSettings, onSave, onClose }) => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Settings>(JSON.parse(JSON.stringify(currentSettings)));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');


  const handleSave = () => {
    onSave(settings);
  };
  
  const handleReset = () => {
    if (window.confirm(t('admin_reset_confirm'))) {
        const newSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        // Keep the current password on reset unless it's the default one
        newSettings.adminPassword = currentSettings.adminPassword;
        setSettings(newSettings);
    }
  }

  const handlePasswordChange = () => {
    setPasswordError('');
    if (newPassword === '') {
        setPasswordError(t('admin_password_err_empty'));
        return;
    }
    if (newPassword !== confirmPassword) {
        setPasswordError(t('admin_password_err_mismatch'));
        return;
    }
    
    setSettings({ ...settings, adminPassword: newPassword });
    setNewPassword('');
    setConfirmPassword('');
    alert(t('admin_password_success_alert'));
  };

  const handleMaterialChange = (index: number, field: keyof Material, value: any) => {
    const newMaterials = [...settings.materials];
    const material = { ...newMaterials[index] };

    if (field === 'max_size_mm') {
        material.max_size_mm = { ...material.max_size_mm, ...value };
    } else if (field === 'price_per_kg') {
        material.price_per_kg = { ...material.price_per_kg, ...value };
    } else {
        (material as any)[field] = value;
    }
    
    newMaterials[index] = material;
    setSettings({ ...settings, materials: newMaterials });
  };

  const handleMaterialColorToggle = (materialIndex: number, colorToToggle: Color) => {
    const newMaterials = [...settings.materials];
    const material = newMaterials[materialIndex];
    const colorIndex = material.colors.findIndex(c => c.id === colorToToggle.id);

    if (colorIndex > -1) {
      // Color exists, so remove it
      material.colors = material.colors.filter(c => c.id !== colorToToggle.id);
    } else {
      // Color doesn't exist, so add it
      material.colors = [...material.colors, colorToToggle].sort((a,b) => 
        PREDEFINED_COLORS.findIndex(p => p.id === a.id) - PREDEFINED_COLORS.findIndex(p => p.id === b.id)
      );
    }
    setSettings({ ...settings, materials: newMaterials });
  };

  const addMaterial = () => {
    const newId = `new_material_${Date.now()}`;
    const newMaterial: Material = {
      id: newId,
      name: t('admin_new_material'),
      price_per_kg: { toman: 1000000, usd: 20 },
      density_g_cm3: 1.2,
      max_size_mm: { x: 300, y: 300, z: 300 },
      speed_modifier_percent: 0,
      max_flow_rate_mm3_s: 20,
      colors: [...PREDEFINED_COLORS]
    };
    setSettings({ ...settings, materials: [...settings.materials, newMaterial] });
  };

  const removeMaterial = (index: number) => {
    const newMaterials = settings.materials.filter((_, i) => i !== index);
    setSettings({ ...settings, materials: newMaterials });
  };
  
  const handleOptionChange = (type: 'nozzles' | 'layerHeights' | 'infills' | 'wallCounts', index: number, field: keyof Option, value: any) => {
    const newOptions = [...settings[type]];
    (newOptions[index] as any)[field] = value;
    setSettings({ ...settings, [type]: newOptions });
  }

  const addOption = (type: 'nozzles' |'layerHeights' | 'infills' | 'wallCounts') => {
    const newId = `new_option_${Date.now()}`;
    const newOption: Option = { id: newId, display_name: t('admin_new_option'), value: 0 };
    setSettings({ ...settings, [type]: [...settings[type], newOption] });
  }

  const removeOption = (type: 'nozzles' |'layerHeights' | 'infills' | 'wallCounts', index: number) => {
    const newOptions = settings[type].filter((_, i) => i !== index);
    setSettings({ ...settings, [type]: newOptions });
  }
  
  const handleTierChange = (index: number, field: keyof PricingTier, value: any) => {
    const newTiers = [...settings.pricingTiers];
    (newTiers[index] as any)[field] = value;
    setSettings({ ...settings, pricingTiers: newTiers });
  }
  
  const addTier = () => {
    const lastTier = settings.pricingTiers[settings.pricingTiers.length - 1];
    const newFromHours = lastTier ? lastTier.to_hours : 0;
    const newTier: PricingTier = {
        id: `new_tier_${Date.now()}`,
        from_hours: newFromHours,
        to_hours: newFromHours + 500,
        discount_percent: 0
    };
    // Adjust previous last tier
    if(lastTier && lastTier.to_hours === Infinity) {
        lastTier.to_hours = lastTier.from_hours + 500;
    }
    setSettings({ ...settings, pricingTiers: [...settings.pricingTiers, newTier] });
  }

  const removeTier = (index: number) => {
    const newTiers = settings.pricingTiers.filter((_, i) => i !== index);
    setSettings({ ...settings, pricingTiers: newTiers });
  }

  return (
    <div className="fixed inset-0 bg-gray-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-gray-100 dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100">
        <header className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-teal-600 dark:text-teal-400">{t('admin_title')}</h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white">&times;</button>
        </header>

        <main className="p-6 flex-1 overflow-y-auto space-y-8">
            {/* --- Materials --- */}
            <section>
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">{t('admin_materials_title')}</h3>
                <div className="space-y-4">
                    {settings.materials.map((mat, index) => (
                        <div key={mat.id} className="p-4 bg-gray-200/50 dark:bg-gray-800/50 rounded-md space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                                <InputField label={t('admin_materials_name')} value={mat.name} onChange={e => handleMaterialChange(index, 'name', e.target.value)} />
                                <InputField label={t('admin_materials_price_toman')} type="number" value={mat.price_per_kg.toman} onChange={e => handleMaterialChange(index, 'price_per_kg', { toman: parseFloat(e.target.value) || 0 })} />
                                <InputField label={t('admin_materials_price_usd')} type="number" value={mat.price_per_kg.usd} onChange={e => handleMaterialChange(index, 'price_per_kg', { usd: parseFloat(e.target.value) || 0 })} />
                                <InputField label={t('admin_materials_density')} type="number" value={mat.density_g_cm3} onChange={e => handleMaterialChange(index, 'density_g_cm3', parseFloat(e.target.value))} />
                                <InputField label={t('admin_materials_speed_mod')} type="number" value={mat.speed_modifier_percent} onChange={e => handleMaterialChange(index, 'speed_modifier_percent', parseFloat(e.target.value))} />
                                <InputField label={t('admin_materials_max_flow')} type="number" value={mat.max_flow_rate_mm3_s} onChange={e => handleMaterialChange(index, 'max_flow_rate_mm3_s', parseFloat(e.target.value) || 0)} />
                                
                                <div className="lg:col-span-3">
                                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('admin_materials_max_dims')}</label>
                                    <div className="grid grid-cols-3 gap-2 mt-1">
                                         <InputField placeholder="X" type="number" value={mat.max_size_mm.x} onChange={e => handleMaterialChange(index, 'max_size_mm', { x: parseFloat(e.target.value) || 0 })} />
                                         <InputField placeholder="Y" type="number" value={mat.max_size_mm.y} onChange={e => handleMaterialChange(index, 'max_size_mm', { y: parseFloat(e.target.value) || 0 })} />
                                         <InputField placeholder="Z" type="number" value={mat.max_size_mm.z} onChange={e => handleMaterialChange(index, 'max_size_mm', { z: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                </div>
                                <div className="lg:col-start-3 self-end">
                                    <button onClick={() => removeMaterial(index)} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded h-10">{t('button_delete')}</button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t('admin_materials_colors')}</label>
                                <div className="flex flex-wrap gap-x-4 gap-y-2 p-2 rounded-md bg-white/50 dark:bg-gray-900/50">
                                    {PREDEFINED_COLORS.map(pColor => {
                                        const isChecked = mat.colors.some(c => c.id === pColor.id);
                                        const name = pColor.nameKey ? t(pColor.nameKey) : pColor.name;
                                        return (
                                            <div key={pColor.id} className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    id={`color_${mat.id}_${pColor.id}`}
                                                    checked={isChecked}
                                                    onChange={() => handleMaterialColorToggle(index, pColor)}
                                                    className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                                />
                                                <label htmlFor={`color_${mat.id}_${pColor.id}`} className="ms-2 me-2 text-sm text-gray-700 dark:text-gray-300 flex items-center cursor-pointer">
                                                   <span className="w-4 h-4 rounded-full inline-block me-1 ms-1 border border-gray-400" style={{ backgroundColor: pColor.hex }}></span>
                                                   {name}
                                                </label>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={addMaterial} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded">{t('button_add_material')}</button>
            </section>
            
            {/* --- Slicer Settings --- */}
            <section>
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">{t('admin_slicer_title')}</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <InputField label={t('admin_slicer_speed_wall')} type="number" value={settings.speed_wall_mm_s} onChange={e => setSettings({...settings, speed_wall_mm_s: parseFloat(e.target.value) || 0})} />
                    <InputField label={t('admin_slicer_speed_infill')} type="number" value={settings.speed_infill_mm_s} onChange={e => setSettings({...settings, speed_infill_mm_s: parseFloat(e.target.value) || 0})} />
                    <InputField label={t('admin_slicer_speed_top_bottom')} type="number" value={settings.speed_top_bottom_mm_s} onChange={e => setSettings({...settings, speed_top_bottom_mm_s: parseFloat(e.target.value) || 0})} />
                    <InputField label={t('admin_slicer_speed_travel')} type="number" value={settings.speed_travel_mm_s} onChange={e => setSettings({...settings, speed_travel_mm_s: parseFloat(e.target.value) || 0})} />
                    <div className="p-3 rounded-md bg-gray-200 dark:bg-gray-800/80 text-sm text-gray-600 dark:text-gray-300 text-center flex flex-col justify-center">
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">{t('admin_slicer_top_bottom_thickness_label')}</label>
                        <p>{t('admin_slicer_top_bottom_thickness_auto_desc')}</p>
                    </div>
                    <InputField label={t('admin_slicer_acceleration_overhead')} type="number" step="0.01" value={settings.acceleration_overhead_factor} onChange={e => setSettings({...settings, acceleration_overhead_factor: parseFloat(e.target.value) || 0})} />
                    <div className="p-3 rounded-md bg-gray-200 dark:bg-gray-800/80 md:col-span-2 lg:col-span-3 text-sm text-gray-600 dark:text-gray-300 text-center">
                        <p><span className="font-bold">{t('admin_slicer_support_overhead_label')}:</span> {t('admin_slicer_support_overhead_ai_desc')}</p>
                    </div>
                </div>
            </section>

            {/* --- Print Options --- */}
            <section>
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">{t('admin_print_options_title')}</h3>
                <div className="grid md:grid-cols-2 gap-8">
                    <OptionEditor type="nozzles" title={t('admin_print_options_nozzles')} options={settings.nozzles} onAdd={() => addOption('nozzles')} onRemove={(i) => removeOption('nozzles', i)} onChange={(i, f, v) => handleOptionChange('nozzles', i, f, v)} />
                    <OptionEditor type="layerHeights" title={t('admin_print_options_layer_heights')} options={settings.layerHeights} onAdd={() => addOption('layerHeights')} onRemove={(i) => removeOption('layerHeights', i)} onChange={(i, f, v) => handleOptionChange('layerHeights', i, f, v)} />
                    <OptionEditor type="infills" title={t('admin_print_options_infills')} options={settings.infills} onAdd={() => addOption('infills')} onRemove={(i) => removeOption('infills', i)} onChange={(i, f, v) => handleOptionChange('infills', i, f, v)} />
                </div>
            </section>

            {/* --- Pricing Tiers --- */}
            <section>
                 <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">{t('admin_pricing_title')}</h3>
                 <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <InputField label={t('admin_pricing_machine_rate_toman')} type="number" value={settings.machineRatePerHour.toman} onChange={e => setSettings({...settings, machineRatePerHour: { ...settings.machineRatePerHour, toman: parseFloat(e.target.value) || 0 }})} />
                    <InputField label={t('admin_pricing_machine_rate_usd')} type="number" value={settings.machineRatePerHour.usd} onChange={e => setSettings({...settings, machineRatePerHour: { ...settings.machineRatePerHour, usd: parseFloat(e.target.value) || 0 }})} />
                 </div>
                 <h4 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">{t('admin_pricing_tiers_title')}</h4>
                 <div className="space-y-2">
                    {settings.pricingTiers.map((tier, index) => (
                        <div key={tier.id} className="p-3 bg-gray-200/50 dark:bg-gray-800/50 rounded-md grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                             <InputField label={t('admin_pricing_tiers_from')} type="number" value={tier.from_hours} onChange={e => handleTierChange(index, 'from_hours', parseFloat(e.target.value) || 0)} />
                             <InputField label={t('admin_pricing_tiers_to')} type="number" value={tier.to_hours === Infinity ? '' : tier.to_hours} placeholder="∞" onChange={e => handleTierChange(index, 'to_hours', e.target.value ? parseFloat(e.target.value) : Infinity)} />
                             <InputField label={t('admin_pricing_tiers_discount')} type="number" value={tier.discount_percent} onChange={e => handleTierChange(index, 'discount_percent', parseFloat(e.target.value) || 0)} />
                             <button onClick={() => removeTier(index)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded h-10">{t('button_delete')}</button>
                        </div>
                    ))}
                 </div>
                 <button onClick={addTier} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded">{t('button_add_tier')}</button>
            </section>
            
            {/* --- Security Settings --- */}
            <section>
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">{t('admin_security_title')}</h3>
                <div className="p-3 bg-gray-200/50 dark:bg-gray-800/50 rounded-md grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-1">
                        <InputField label={t('admin_security_new_password')} type="password" value={newPassword} onChange={e => { setNewPassword(e.target.value); setPasswordError(''); }} />
                    </div>
                    <div className="md:col-span-1">
                        <InputField label={t('admin_security_confirm_password')} type="password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setPasswordError(''); }} />
                    </div>
                    <button onClick={handlePasswordChange} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded h-10">
                        {t('button_change_password')}
                    </button>
                </div>
                {passwordError && <p className="text-red-500 text-sm mt-2">{passwordError}</p>}
            </section>

        </main>
        
        <footer className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-100 dark:bg-gray-900">
          <button onClick={handleReset} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded">{t('button_reset_defaults')}</button>
          <div className="flex gap-4">
            <button onClick={onClose} className="bg-gray-500 hover:bg-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">{t('button_cancel')}</button>
            <button onClick={handleSave} className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-6 rounded">{t('button_save_changes')}</button>
          </div>
        </footer>
      </div>
    </div>
  );
};

const InputField = ({ label, ...props }: { label?: string, [key: string]: any }) => (
    <div>
        {label && <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>}
        <input {...props} className="w-full p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-teal-500 dark:focus:border-teal-400 outline-none" />
    </div>
);

const OptionEditor = ({type, title, options, onAdd, onRemove, onChange}) => {
    const { t } = useTranslation();
    return (
        <div>
            <h4 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">{title}</h4>
            <div className="space-y-2">
                {options.map((opt, index) => (
                    <div key={opt.id} className="flex gap-2 items-end">
                        <InputField label={t('admin_option_display_name')} value={opt.display_name} onChange={e => onChange(index, 'display_name', e.target.value)} />
                        <InputField label={t('admin_option_value')} type="number" value={opt.value} onChange={e => onChange(index, 'value', parseFloat(e.target.value))} />
                        <button onClick={() => onRemove(index)} className="bg-red-600 hover:bg-red-700 text-white font-bold p-2 rounded h-10 mb-px">&times;</button>
                    </div>
                ))}
            </div>
            <button onClick={onAdd} className="mt-3 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-3 rounded">{t('button_add')}</button>
        </div>
    )
};


export default AdminPanel;