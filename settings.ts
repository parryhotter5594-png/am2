import { Settings, Material } from './types';
import { PREDEFINED_COLORS } from './constants';

const SETTINGS_STORAGE_KEY = '3d_print_analyzer_settings';

export const DEFAULT_SETTINGS: Settings = {
  adminPassword: 'admin',
  materials: [
    { id: 'pla', name: 'PLA', nameKey: 'material_pla', price_per_kg: { toman: 1700000, usd: 28 }, density_g_cm3: 1.24, max_size_mm: { x: 380, y: 380, z: 380 }, speed_modifier_percent: 0, max_flow_rate_mm3_s: 20, colors: [...PREDEFINED_COLORS] },
    { id: 'abs', name: 'ABS', nameKey: 'material_abs', price_per_kg: { toman: 1000000, usd: 17 }, density_g_cm3: 1.04, max_size_mm: { x: 200, y: 200, z: 200 }, speed_modifier_percent: -10, max_flow_rate_mm3_s: 18, colors: PREDEFINED_COLORS.filter(c => ['black', 'white', 'gray', 'red'].includes(c.id)) },
    { id: 'petg', name: 'PETG', nameKey: 'material_petg', price_per_kg: { toman: 1700000, usd: 28 }, density_g_cm3: 1.27, max_size_mm: { x: 250, y: 250, z: 250 }, speed_modifier_percent: 5, max_flow_rate_mm3_s: 15, colors: PREDEFINED_COLORS.filter(c => !['green'].includes(c.id)) },
    { id: 'tpu', name: 'TPU', nameKey: 'material_tpu', price_per_kg: { toman: 2300000, usd: 38 }, density_g_cm3: 1.20, max_size_mm: { x: 380, y: 380, z: 380 }, speed_modifier_percent: -25, max_flow_rate_mm3_s: 8, colors: PREDEFINED_COLORS.filter(c => ['black', 'white', 'red', 'blue'].includes(c.id)) },
  ],
  nozzles: [
    { id: '0.25', display_name: '0.25mm (جزئیات)', displayNameKey: 'nozzle_detail', value: 0.25 },
    { id: '0.4', display_name: '0.4mm (استاندارد)', displayNameKey: 'nozzle_standard', value: 0.4 },
    { id: '0.6', display_name: '0.6mm (سریع)', displayNameKey: 'nozzle_fast', value: 0.6 },
  ],
  layerHeights: [
    { id: '0.16', display_name: 'دقیق (0.16mm)', displayNameKey: 'layer_height_fine', value: 0.16 },
    { id: '0.20', display_name: 'استاندارد (0.20mm)', displayNameKey: 'layer_height_standard', value: 0.20 },
    { id: '0.28', display_name: 'سریع (0.28mm)', displayNameKey: 'layer_height_fast', value: 0.28 },
    { id: '0.36', display_name: 'خیلی سریع (0.36mm)', displayNameKey: 'layer_height_very_fast', value: 0.36 },
  ],
  infills: [
    { id: '15', display_name: 'نمونه اولیه (15%)', displayNameKey: 'infill_prototype', value: 15 },
    { id: '30', display_name: 'کاربردی (30%)', displayNameKey: 'infill_functional', value: 30 },
    { id: '50', display_name: 'مستحکم (50%)', displayNameKey: 'infill_strong', value: 50 },
  ],
  wallCounts: [
    { id: '2', display_name: 'استاندارد (2)', displayNameKey: 'walls_standard', value: 2 },
    { id: '3', display_name: 'مستحکم (3)', displayNameKey: 'walls_strong', value: 3 },
    { id: '4', display_name: 'بسیار مستحکم (4)', displayNameKey: 'walls_very_strong', value: 4 },
  ],
  pricingTiers: [
    { id: 'tier1', from_hours: 0, to_hours: 500, discount_percent: 0 },
    { id: 'tier2', from_hours: 500, to_hours: 1500, discount_percent: 10 },
    { id: 'tier3', from_hours: 1500, to_hours: 2500, discount_percent: 20 },
    { id: 'tier4', from_hours: 2500, to_hours: Infinity, discount_percent: 30 },
  ],
  machineRatePerHour: { toman: 110000.0, usd: 1.8 },
  // Slicer settings for local calculation
  speed_wall_mm_s: 70,
  speed_infill_mm_s: 100,
  speed_top_bottom_mm_s: 50,
  speed_travel_mm_s: 200,
  support_overhead_percent: 10,
  acceleration_overhead_factor: 1.15, // 15% time overhead for acceleration
};


export const loadSettings = (): Settings => {
    try {
        const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (storedSettings) {
            const parsed = JSON.parse(storedSettings);
            
            // --- BACKWARD COMPATIBILITY MIGRATIONS ---
            // Migrate single currency to dual currency
            if (typeof parsed.machineRatePerHour === 'number') {
                parsed.machineRatePerHour = {
                    toman: parsed.machineRatePerHour,
                    usd: DEFAULT_SETTINGS.machineRatePerHour.usd
                };
            }
            if (parsed.materials) {
                parsed.materials.forEach((mat: any) => {
                    if (typeof mat.price_per_kg === 'number') {
                        const defaultMat = DEFAULT_SETTINGS.materials.find(m => m.id === mat.id);
                        mat.price_per_kg = {
                            toman: mat.price_per_kg,
                            usd: defaultMat ? defaultMat.price_per_kg.usd : 25
                        };
                    }
                });
            }

            // Merge stored settings with defaults to ensure new fields are present
            const fullSettings = { ...DEFAULT_SETTINGS, ...parsed };

            // Ensure adminPassword exists for backwards compatibility
            if (!fullSettings.adminPassword) {
                fullSettings.adminPassword = DEFAULT_SETTINGS.adminPassword;
            }
            
            // Backwards compatibility for materials missing colors or other new fields
            if (fullSettings.materials) {
                fullSettings.materials.forEach((mat: Material) => {
                    if (!mat.colors || !Array.isArray(mat.colors)) {
                        mat.colors = [...PREDEFINED_COLORS]; // Give them all colors by default if missing
                    }
                    if (mat.max_flow_rate_mm3_s === undefined) {
                        const defaultMat = DEFAULT_SETTINGS.materials.find(m => m.id === mat.id);
                        mat.max_flow_rate_mm3_s = defaultMat?.max_flow_rate_mm3_s ?? 20; // Default to 20 if not found
                    }
                });
            }

            // Basic validation
            if (fullSettings.materials && fullSettings.pricingTiers && fullSettings.machineRatePerHour && fullSettings.nozzles) {
                 return fullSettings;
            }
        }
    } catch (error) {
        console.error("Failed to load settings from localStorage, using defaults.", error);
    }
    return DEFAULT_SETTINGS;
};

export const saveSettings = (settings: Settings) => {
    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error("Failed to save settings to localStorage.", error);
    }
};