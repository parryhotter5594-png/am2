import { GoogleGenAI } from "@google/genai";
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { ValidationResult, QuoteData, Material, Settings, Color } from './types';
import { AppStatus, ANALYSIS_RESPONSE_SCHEMA, OPTIMAL_ORIENTATION_RESPONSE_SCHEMA, SUGGESTED_SETTINGS_RESPONSE_SCHEMA, SUPPORT_ESTIMATION_RESPONSE_SCHEMA } from './types';
import { loadSettings, saveSettings } from './settings';
import FileUploader from './components/FileUploader';
import AnalysisStatus from './components/AnalysisStatus';
import PrintOptions from './components/PrintOptions';
import QuoteDisplay from './components/QuoteDisplay';
import { Loader } from './components/Loader';
import OrientationControl from './components/OrientationControl';
import ThreeDViewer from './components/ThreeDViewer';
import SettingsOptimizer from "./components/SettingsOptimizer";
import AdminPanel from "./components/AdminPanel";
import LoginModal from "./components/LoginModal";
import ThemeToggle from "./components/ThemeToggle";
import LanguageToggle from "./components/LanguageToggle";
import { AILogoIcon } from "./components/icons/AILogoIcon";
import ProgressBar from "./components/ProgressBar";
import { useTranslation } from './i18n';


// Initialize the Gemini API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- AI-Powered Simulation Logic ---

const estimateSupportWithAI = async (fileName: string, dimensions: {x:number, y:number, z:number}): Promise<number> => {
    const prompt = `You are an expert 3D printing engineer. A model named '${fileName}' with dimensions ${dimensions.x.toFixed(1)}x${dimensions.y.toFixed(1)}x${dimensions.z.toFixed(1)} mm is being analyzed. 
    Your task is to estimate the support requirement percentage. This percentage represents how much extra material and time will be needed for support structures relative to the model itself.
    - Analyze the filename for clues about its geometry (e.g., 'figurine', 'sculpture', 'overhang_test' suggest high support needs; 'box', 'plate', 'coaster' suggest low to no support).
    - Consider the dimensions. Tall, thin, or complex shapes usually need more support.
    - Based on this, estimate the 'support overhead' as a percentage.
    - Examples:
      - A 'detailed human figurine' might need 25%.
      - A simple 'phone_stand.stl' might need 10%.
      - A 'flat_calibration_coin.stl' would require 0%.
    - Return a single number for the percentage. For instance, if you estimate 15%, return 15.
    - Provide a brief reasoning for your choice.`;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: SUPPORT_ESTIMATION_RESPONSE_SCHEMA,
        },
    });

    try {
        const result = JSON.parse(response.text);
        return result.support_overhead_percent;
    } catch (e) {
        console.error("Error parsing AI support estimation response:", e);
        // Fallback to a default value if AI fails
        return 10;
    }
};

const findOptimalOrientationWithAI = async (fileName: string): Promise<{x: number, y: number, z: number}> => {
    const prompt = `You are an expert 3D printing slicer engineer. Your task is to determine the optimal print orientation for a model based on its filename: "${fileName}". The goal is to balance minimizing support material, reducing print time (Z-height), and maximizing part strength.
    - Analyze the filename for clues about its geometry (e.g., 'figurine' might stand upright, 'bracket' might lie flat on its largest face).
    - Common sense rules:
      - Place the largest flat surface on the print bed for adhesion.
      - Orient for minimal overhangs to reduce support needs.
      - For mechanical parts, orient layers to align with expected stresses.
      - Tall, thin models should be laid down if stability is an issue.
    - Based on your analysis, provide the optimal rotation around the X, Y, and Z axes in degrees. A 90-degree rotation is most common.
    - Provide a brief reasoning for your choice.
    - Return the result as a JSON object matching the schema. For example, if no rotation is needed, return { "rotation_degrees": { "x": 0, "y": 0, "z": 0 }, "reasoning": "The model is already in its optimal orientation with the largest flat face down." }`;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: OPTIMAL_ORIENTATION_RESPONSE_SCHEMA,
        },
    });

    try {
        const result = JSON.parse(response.text);
        return result.rotation_degrees;
    } catch (e) {
        console.error("Error parsing AI orientation response:", e);
        throw new Error("Failed to determine optimal orientation.");
    }
};

const analyzeModelWithAI = async (fileName: string, modelData: { volume_cm3: number; dimensions_mm: {x:number, y:number, z:number}}, materials: Material[]): Promise<ValidationResult> => {
    // Find the overall max dimensions from all materials
    const maxX = Math.max(...materials.map(m => m.max_size_mm.x));
    const maxY = Math.max(...materials.map(m => m.max_size_mm.y));
    const maxZ = Math.max(...materials.map(m => m.max_size_mm.z));

    const prompt = `You are a 3D print analysis tool. A model named '${fileName}' with accurate, pre-calculated dimensions of ${modelData.dimensions_mm.x.toFixed(1)}x${modelData.dimensions_mm.y.toFixed(1)}x${modelData.dimensions_mm.z.toFixed(1)} mm and a volume of ${modelData.volume_cm3.toFixed(2)} cm³ is provided.

    Your ONLY task is to check for non-geometric printability issues. DO NOT CHANGE the provided dimensions or volume.
    - Based on common 3D model problems, determine if the model is printable.
    - Hard limit check: if any dimension exceeds the machine build volume of ${maxX}mm, set is_printable to false, is_repairable to false, and add a clear error message about the size limit.
    - Occasionally (about 15% of the time), introduce a common, repairable error like 'non-manifold edges'. Set is_printable to false and is_repairable to true.
    - Rarely (about 5% of the time), introduce a critical, unrepairable error like 'corrupt file structure'. Set is_printable to false and is_repairable to false.
    - If no issues are found, set is_printable to true, errors to an empty array, and is_repairable to false.

    Return the result as a JSON object matching the provided schema. Only return the boolean flags and the errors array. The geometric data is already known.`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: ANALYSIS_RESPONSE_SCHEMA,
        },
    });

    try {
        const result = JSON.parse(response.text);
        // We only trust the AI for printability flags and errors, not geometry.
        return { 
            is_printable: result.is_printable,
            is_repairable: result.is_repairable,
            errors: result.errors
        };
    } catch (e) {
        console.error("Error parsing AI analysis response:", e);
        return { is_printable: false, is_repairable: false, errors: ["Invalid response from AI."], };
    }
};

const repairModelWithAI = async (): Promise<Pick<ValidationResult, 'is_printable' | 'errors'>> => {
    // This function now just simulates a successful repair without needing geometry.
    // It returns a successful state.
    return Promise.resolve({
      is_printable: true,
      errors: [],
    });
};


const calculateQuoteLocally = (
  validationResult: ValidationResult,
  material: Material,
  nozzleDiameter: number,
  layerHeight: number,
  infillPercent: number,
  wallCount: number,
  settings: Settings,
  supportPercent: number
): {time_hours: number, material_grams: number, speedScalingFactor: number} => {
    if (!validationResult.volume_cm3 || !validationResult.dimensions_mm) {
        throw new Error("Cannot calculate quote without model geometry.");
    }

    const dims_mm = validationResult.dimensions_mm;
    const total_volume_cm3 = validationResult.volume_cm3;

    // --- Derived Slicer Parameters ---
    const line_width_mm = nozzleDiameter * 1.2;
    const material_density_g_cm3 = material.density_g_cm3;
    const speed_modifier = 1 - (material.speed_modifier_percent / 100);
    const top_bottom_thickness_mm = nozzleDiameter * wallCount;

    // --- Flow Rate Speed Adjustment ---
    const maxFlowRate = material.max_flow_rate_mm3_s;
    let speedScalingFactor = 1;

    if (maxFlowRate) {
        // Use infill speed as it's typically the fastest and most demanding on flow
        const theoreticalFlowRate = layerHeight * line_width_mm * settings.speed_infill_mm_s;
        if (theoreticalFlowRate > maxFlowRate) {
            speedScalingFactor = maxFlowRate / theoreticalFlowRate;
        }
    }
    
    // Apply speed scaling factor to non-travel speeds
    const effective_speed_wall_mm_s = settings.speed_wall_mm_s * speedScalingFactor;
    const effective_speed_infill_mm_s = settings.speed_infill_mm_s * speedScalingFactor;
    const effective_speed_top_bottom_mm_s = settings.speed_top_bottom_mm_s * speedScalingFactor;

    // --- Layer-based estimations ---
    const num_layers = dims_mm.z / layerHeight;
    const avg_layer_area_mm2 = (total_volume_cm3 * 1000) / dims_mm.z;
    // Approximate perimeter from bounding box, as it's more stable than from area
    const avg_perimeter_mm = 2 * (dims_mm.x + dims_mm.y);

    // --- Path length estimations (per layer) ---
    const wall_path_length_per_layer_mm = avg_perimeter_mm * wallCount;
    const wall_area_per_layer_mm2 = wall_path_length_per_layer_mm * line_width_mm;
    const infill_area_per_layer_mm2 = Math.max(0, avg_layer_area_mm2 - wall_area_per_layer_mm2);
    const infill_path_length_per_layer_mm = (infill_area_per_layer_mm2 * (infillPercent / 100)) / line_width_mm;
    const num_top_bottom_layers = Math.ceil(top_bottom_thickness_mm / layerHeight) * 2; // For both top and bottom
    const solid_layer_path_length_mm = avg_layer_area_mm2 / line_width_mm;


    // --- Total Time Calculation (in seconds) ---
    const time_walls_s = (wall_path_length_per_layer_mm * num_layers) / effective_speed_wall_mm_s;
    const time_infill_s = (infill_path_length_per_layer_mm * num_layers) / effective_speed_infill_mm_s;
    const time_top_bottom_s = (solid_layer_path_length_mm * num_top_bottom_layers) / effective_speed_top_bottom_mm_s;
    // Heuristic for travel time: assume half a bounding-box cross move per layer
    const time_travel_s = num_layers * ((dims_mm.x + dims_mm.y) * 0.5) / settings.speed_travel_mm_s;

    const total_print_time_s = time_walls_s + time_infill_s + time_top_bottom_s;
    
    // Approximate support time based on print time
    const time_support_s = total_print_time_s * (supportPercent / 100);
    
    const base_time_s = total_print_time_s + time_travel_s + time_support_s;

    // Apply overheads and modifiers
    const final_time_s = base_time_s * settings.acceleration_overhead_factor * speed_modifier;
    const time_hours = final_time_s / 3600;


    // --- Total Material Calculation (in grams) ---
    const wall_volume_mm3 = wall_path_length_per_layer_mm * line_width_mm * layerHeight * num_layers;
    const infill_volume_mm3 = infill_path_length_per_layer_mm * line_width_mm * layerHeight * num_layers;
    const top_bottom_volume_mm3 = solid_layer_path_length_mm * line_width_mm * layerHeight * num_top_bottom_layers;

    const model_volume_cm3 = (wall_volume_mm3 + infill_volume_mm3 + top_bottom_volume_mm3) / 1000;
    
    // Approximate support material based on model material
    const support_volume_cm3 = model_volume_cm3 * (supportPercent / 100);

    const final_volume_cm3 = model_volume_cm3 + support_volume_cm3;
    const material_grams = final_volume_cm3 * material_density_g_cm3;

    return { time_hours, material_grams, speedScalingFactor };
};


export type WizardStep = 'UPLOAD' | 'ANALYZE' | 'OPTIONS' | 'QUOTE';
type RawQuote = { time_hours: number; material_grams: number; speedScalingFactor: number; } | null;
interface QuotedOptions {
    materialId: string;
    nozzleId: string;
    layerHeight: number;
    infill: number;
    wallCount: number;
    quantity: number;
}

const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedTheme = window.localStorage.getItem('theme');
    if (storedTheme === 'dark' || storedTheme === 'light') {
      return storedTheme;
    }
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  }
  return 'light';
};


const ActionButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ onClick, disabled, isLoading, children, className = '' }) => (
  <button
    onClick={onClick}
    disabled={disabled || isLoading}
    className={`w-full flex items-center justify-center p-3 text-lg font-bold rounded-md transition-colors duration-200 ${
      disabled || isLoading
        ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
        : 'bg-teal-500 hover:bg-teal-600 text-white'
    } ${className}`}
  >
    {isLoading ? <Loader /> : children}
  </button>
);

const BackButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center p-3 text-lg font-bold rounded-md transition-colors duration-200 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-white sm:w-auto"
    >
      {children}
    </button>
);

const ModelInfoDisplay: React.FC<{ result: ValidationResult }> = ({ result }) => {
    const { t } = useTranslation();
    return (
        <div className="p-4 rounded-lg bg-gray-200/50 dark:bg-gray-800/50 mt-4 border border-gray-300 dark:border-gray-700">
            <h4 className="font-semibold text-gray-600 dark:text-gray-300 mb-2 text-center">{t('model_specs_title')}</h4>
            <div className="space-y-1 font-mono text-sm">
                {result.dimensions_mm && (
                     <div className="flex justify-between items-center">
                        <span className="text-gray-500 dark:text-gray-400">{t('model_specs_dimensions')}:</span>
                        <span className="text-gray-700 dark:text-gray-200 text-right">{`X: ${result.dimensions_mm.x.toFixed(1)}, Y: ${result.dimensions_mm.y.toFixed(1)}, Z: ${result.dimensions_mm.z.toFixed(1)}`}</span>
                    </div>
                )}
                {result.volume_cm3 && (
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500 dark:text-gray-400">{t('model_specs_volume')}:</span>
                        <span className="text-gray-700 dark:text-gray-200">{result.volume_cm3.toFixed(2)} cm³</span>
                    </div>
                )}
            </div>
        </div>
    );
};


const App: React.FC = () => {
  const { t, setLanguage, language } = useTranslation();
  const [settings, setSettings] = useState<Settings>(loadSettings());
  const [step, setStep] = useState<WizardStep>('UPLOAD');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [file, setFile] = useState<File | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [originalValidationResult, setOriginalValidationResult] = useState<ValidationResult | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(settings.materials[0].id);
  const [selectedNozzleId, setSelectedNozzleId] = useState<string>(settings.nozzles.find(n => n.value === 0.4)?.id || settings.nozzles[0].id);
  const [selectedLayerHeight, setSelectedLayerHeight] = useState<number>(settings.layerHeights[1].value);
  const [selectedInfill, setSelectedInfill] = useState<number>(settings.infills[1].value);
  const [selectedWallCount, setSelectedWallCount] = useState<number>(settings.wallCounts[0].value);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [rawQuote, setRawQuote] = useState<RawQuote>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [wasRepaired, setWasRepaired] = useState<boolean>(false);
  const [rotation, setRotation] = useState<[number, number, number]>([0, 0, 0]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [orientationError, setOrientationError] = useState<string | null>(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  
  const [optimizationPrompt, setOptimizationPrompt] = useState<string>('');
  const [suggestedSettings, setSuggestedSettings] = useState<{ settings: any; reasoning: string } | null>(null);
  
  const [shouldCalculate, setShouldCalculate] = useState(false);
  const [quotedOptions, setQuotedOptions] = useState<QuotedOptions | null>(null);
  const [aiSupportPercent, setAiSupportPercent] = useState<number | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme());

  const analysisStarted = useRef(false);

  // State for admin panel triple-click trigger
  const [adminClickCount, setAdminClickCount] = useState(0);
  const adminClickTimer = useRef<number | null>(null);

  // Effect to synchronize theme state with the DOM and localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem('theme', theme);
    } catch (e) {
      console.error("Failed to save theme to localStorage", e);
    }
  }, [theme]);

  // Effect to synchronize language state with the DOM and localStorage
  useEffect(() => {
      const root = document.documentElement;
      root.lang = language;
      root.dir = language === 'fa' ? 'rtl' : 'ltr';
  }, [language]);


  const toggleTheme = () => {
    setTheme(currentTheme => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  const handleLanguageToggle = () => {
    const newLang = language === 'fa' ? 'en' : 'fa';
    setLanguage(newLang);
  };


  const handleAdminClick = () => {
    const newCount = adminClickCount + 1;
    setAdminClickCount(newCount);

    if (adminClickTimer.current) {
        clearTimeout(adminClickTimer.current);
    }

    if (newCount >= 3) {
        setIsLoginModalOpen(true);
        setAdminClickCount(0);
        adminClickTimer.current = null;
    } else {
        adminClickTimer.current = window.setTimeout(() => {
            setAdminClickCount(0);
            adminClickTimer.current = null;
        }, 500); // 500ms window for triple click
    }
  };

  const handleLoginSuccess = () => {
    setIsLoginModalOpen(false);
    setIsAdminPanelOpen(true);
  };


  const handleSettingsSave = (newSettings: Settings) => {
    saveSettings(newSettings);
    setSettings(newSettings);
    setIsAdminPanelOpen(false);
    // Optionally, reset the app to apply new settings cleanly
    handleReset();
  };

  const handleReset = useCallback(() => {
    const currentSettings = loadSettings(); // Reload settings on reset
    setSettings(currentSettings);
    if (modelUrl) {
      URL.revokeObjectURL(modelUrl);
    }
    setStep('UPLOAD');
    setStatus(AppStatus.IDLE);
    setFile(null);
    setModelUrl(null);
    setValidationResult(null);
    setOriginalValidationResult(null);
    setQuoteData(null);
    setRawQuote(null);
    setQuotedOptions(null);
    setQuantity(1);
    setWasRepaired(false);
    setSelectedMaterialId(currentSettings.materials[0]?.id || '');
    setSelectedNozzleId(currentSettings.nozzles.find(n => n.value === 0.4)?.id || currentSettings.nozzles[0].id);
    setSelectedLayerHeight(currentSettings.layerHeights[1]?.value || 0.2);
    setSelectedInfill(currentSettings.infills[1]?.value || 30);
    setSelectedWallCount(currentSettings.wallCounts[0]?.value || 2);
    setSelectedColor('');
    setRotation([0, 0, 0]);
    setApiError(null);
    setOrientationError(null);
    analysisStarted.current = false;
    setOptimizationPrompt('');
    setSuggestedSettings(null);
    setAiSupportPercent(null);
  }, [modelUrl]);
  
  const handleFileSelect = useCallback((selectedFile: File) => {
    if (modelUrl) {
        URL.revokeObjectURL(modelUrl);
    }
    
    handleReset();
    setFile(selectedFile);
    setOrientationError(null);
    const newUrl = URL.createObjectURL(selectedFile);
    setModelUrl(newUrl);
  }, [modelUrl, handleReset]);
  
  const handleProceedToAnalysis = useCallback(() => {
    if (!file) return;
    setStep('ANALYZE');
    setStatus(AppStatus.ANALYZING);
    analysisStarted.current = true;
  }, [file]);

  const handleModelLoad = useCallback(async (modelData: { volume_cm3: number; dimensions_mm: { x: number; y: number; z: number; } }) => {
      if (!file || !analysisStarted.current) return;
      
      try {
        setApiError(null);
        const aiResult = await analyzeModelWithAI(file.name, modelData, settings.materials);
        
        const finalResult: ValidationResult = {
          ...aiResult,
          volume_cm3: modelData.volume_cm3,
          dimensions_mm: modelData.dimensions_mm,
        };

        setValidationResult(finalResult);
        setOriginalValidationResult(finalResult);
    
        if (finalResult.is_printable) {
          setStatus(AppStatus.ESTIMATING_SUPPORT);
          const supportPercent = await estimateSupportWithAI(file.name, finalResult.dimensions_mm!);
          setAiSupportPercent(supportPercent);
          setStatus(AppStatus.SUCCESS);
        } else if (finalResult.is_repairable) {
          setStatus(AppStatus.REPAIR_PROMPT);
        } else {
          setStatus(AppStatus.ERROR);
        }
      } catch (error: any) {
          console.error("Error analyzing model with AI:", error);
          const errorMessage = error?.error?.message || t('error_contact_service');
          setApiError(`Error analyzing model with AI:\n${JSON.stringify(error, null, 2)}`);
          setStatus(AppStatus.ERROR);
      }
  }, [file, settings.materials, t]);

  const handleDimensionsUpdate = useCallback((dimensions_mm: { x: number; y: number; z: number; }) => {
    setValidationResult(prev => prev ? { ...prev, dimensions_mm } : null);
  }, []);

  const handleAttemptRepair = useCallback(async () => {
    if (!validationResult) return;
    setStatus(AppStatus.REPAIRING);
    setApiError(null);
    try {
        const repairFlags = await repairModelWithAI();
        const repairedResult = { ...validationResult, ...repairFlags, is_repairable: false };

        setValidationResult(repairedResult);
        setOriginalValidationResult(repairedResult); // Update original too
        setWasRepaired(true);
        setStatus(AppStatus.ESTIMATING_SUPPORT);
        const supportPercent = await estimateSupportWithAI(file!.name, repairedResult.dimensions_mm!);
        setAiSupportPercent(supportPercent);
        setStatus(AppStatus.SUCCESS);
    } catch (error) {
        console.error("Error repairing model with AI:", error);
        setApiError(t('error_repairing_model'));
        setStatus(AppStatus.ERROR);
    }

  }, [validationResult, file, t]);
  
  const handleProceedToOptions = useCallback(() => {
    setStep('OPTIONS');
  }, []);
  
  const handleGoBack = useCallback(() => {
    setApiError(null);
    if (step === 'ANALYZE') {
        setStep('UPLOAD');
        setStatus(AppStatus.IDLE);
        analysisStarted.current = false;
        setValidationResult(originalValidationResult);
    } else if (step === 'OPTIONS') {
        setStep('ANALYZE');
        setStatus(AppStatus.SUCCESS);
    } else if (step === 'QUOTE') {
        setStep('OPTIONS');
        setQuoteData(null);
        setRawQuote(null);
        setQuotedOptions(null);
        setSuggestedSettings(null);
        setStatus(AppStatus.SUCCESS);
    }
  }, [step, originalValidationResult]);

  const handleFindOptimalOrientation = useCallback(async () => {
    if (!file) return;
    setStatus(AppStatus.ORIENTING);
    setOrientationError(null);
    try {
      const result = await findOptimalOrientationWithAI(file.name);
      const newRotationRad: [number, number, number] = [
        result.x * (Math.PI / 180),
        result.y * (Math.PI / 180),
        result.z * (Math.PI / 180),
      ];
      setRotation(newRotationRad);
      setStatus(AppStatus.IDLE); 
    } catch (error) {
      console.error("Error finding optimal orientation:", error);
      setOrientationError(t('error_finding_orientation'));
      setStatus(AppStatus.IDLE);
    }
  }, [file, t]);
  
  const calculateAndSetQuote = useCallback(() => {
    if (!validationResult?.volume_cm3 || !validationResult?.dimensions_mm) return;
    
    setStatus(AppStatus.QUOTING);
    setApiError(null);
    
    const material = settings.materials.find(m => m.id === selectedMaterialId);
    const nozzle = settings.nozzles.find(n => n.id === selectedNozzleId);

    if (material && nozzle) {
      try {
        const supportToUse = aiSupportPercent ?? settings.support_overhead_percent;
        const raw = calculateQuoteLocally(validationResult, material, nozzle.value, selectedLayerHeight, selectedInfill, selectedWallCount, settings, supportToUse);
        setRawQuote(raw);

        // Client-side cost calculation based on language
        const pricePerKg = language === 'fa' ? material.price_per_kg.toman : material.price_per_kg.usd;
        const ratePerHour = language === 'fa' ? settings.machineRatePerHour.toman : settings.machineRatePerHour.usd;

        const materialCost = (raw.material_grams / 1000) * pricePerKg;
        const machineTimeCost = raw.time_hours * ratePerHour;
        let price = materialCost + machineTimeCost;

        // Rounding logic for different currencies
        if (language === 'fa') {
            price = Math.ceil(price / 1000) * 1000; // Round to nearest 1000 Toman
        } else {
            price = parseFloat(price.toFixed(2)); // Round to 2 decimal places for USD
        }

        const hours = Math.floor(raw.time_hours);
        const minutes = Math.round((raw.time_hours - hours) * 60);

        const formatted = {
            time: t('quote_time_format', { hours, minutes }),
            material: parseFloat(raw.material_grams.toFixed(2)),
            price: price,
            material_cost: materialCost,
            machine_time_cost: machineTimeCost,
        };
        
        setQuoteData(formatted);
        const newQuotedOptions: QuotedOptions = {
            materialId: selectedMaterialId,
            nozzleId: selectedNozzleId,
            layerHeight: selectedLayerHeight,
            infill: selectedInfill,
            wallCount: selectedWallCount,
            quantity: quantity,
        };
        setQuotedOptions(newQuotedOptions);
        setStatus(AppStatus.SUCCESS);

      } catch (error) {
        console.error("Error calculating quote:", error);
        setApiError(t('error_calculating_quote'));
        setStatus(AppStatus.ERROR);
        setQuoteData(null);
        setRawQuote(null);
        setQuotedOptions(null);
      }
    }
  }, [validationResult, settings, selectedMaterialId, selectedNozzleId, selectedLayerHeight, selectedInfill, selectedWallCount, quantity, t, language, aiSupportPercent]);

  useEffect(() => {
    if (shouldCalculate) {
      calculateAndSetQuote();
      setShouldCalculate(false);
    }
  }, [shouldCalculate, calculateAndSetQuote]);


  const handleRequestQuote = useCallback(() => {
    setStep('QUOTE');
    setShouldCalculate(true);
  }, []);

  const handleGetSuggestedSettings = useCallback(async () => {
    if (!optimizationPrompt) return;

    setStatus(AppStatus.OPTIMIZING_SETTINGS);
    setApiError(null);
    setSuggestedSettings(null);

    const availableSettings = `
      - Materials: ${JSON.stringify(settings.materials.map(m => ({ id: m.id, name: m.name })))}
      - Nozzle Diameters (mm): ${JSON.stringify(settings.nozzles.map(o => ({ value: o.value, name: o.display_name })))}
      - Layer Heights (mm): ${JSON.stringify(settings.layerHeights.map(o => ({ value: o.value, name: o.display_name })))}
      - Infill Percentages (%): ${JSON.stringify(settings.infills.map(o => ({ value: o.value, name: o.display_name })))}
      - Wall Counts: ${JSON.stringify(settings.wallCounts.map(o => ({ value: o.value, name: o.display_name })))}
    `;

    const prompt = `You are a 3D printing expert. A user wants to print a part and has described their needs. Based on their request and the available settings, suggest the optimal configuration.

    **User's Request:** "${optimizationPrompt}"

    **Available Settings:**
    ${availableSettings}

    **Your Task:**
    1. Analyze the user's request to understand the priority (e.g., strength, speed, cost, visual quality, flexibility).
    2. Choose the single best option from EACH of the available settings categories. The values you return MUST EXACTLY match one of the available values for each category (e.g., for material_id, choose from ['pla', 'abs', ...], for nozzle_diameter_mm, choose from [0.4, 0.6], etc.).
    3. IMPORTANT: The selected Layer Height MUST be valid for the chosen Nozzle Diameter. Rule: Layer Height <= Nozzle Diameter * 0.75.
    4. Provide a brief, clear reasoning for your choices, explaining how they meet the user's needs.
    5. Return the result as a JSON object matching the provided schema. For example, if the user wants a strong part, suggest 'petg' or 'abs', higher infill, and more walls. If they want a cheap prototype, suggest 'pla', a larger nozzle, a thicker layer height, and low infill.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: SUGGESTED_SETTINGS_RESPONSE_SCHEMA,
            },
        });

        const result = JSON.parse(response.text);
        setSuggestedSettings({ settings: result, reasoning: result.reasoning });
        setStatus(AppStatus.SUCCESS); // Revert to SUCCESS to re-enable inputs
    } catch (error) {
        console.error("Error getting suggested settings:", error);
        setApiError(t('error_getting_suggestions'));
        setStatus(AppStatus.SUCCESS); // Revert to SUCCESS so user is not blocked
    }
}, [optimizationPrompt, settings, t]);

const handleApplySuggestedSettings = useCallback((settingsToApply: any) => {
    if (settings.materials.some(m => m.id === settingsToApply.material_id)) {
        setSelectedMaterialId(settingsToApply.material_id);
    }
    if (settings.nozzles.some(o => o.value === settingsToApply.nozzle_diameter_mm)) {
        const nozzle = settings.nozzles.find(o => o.value === settingsToApply.nozzle_diameter_mm);
        if(nozzle) setSelectedNozzleId(nozzle.id);
    }
    if (settings.layerHeights.some(o => o.value === settingsToApply.layer_height_mm)) {
        setSelectedLayerHeight(settingsToApply.layer_height_mm);
    }
    if (settings.infills.some(o => o.value === settingsToApply.infill_percent)) {
        setSelectedInfill(settingsToApply.infill_percent);
    }
    if (settings.wallCounts.some(o => o.value === settingsToApply.wall_count)) {
        setSelectedWallCount(settingsToApply.wall_count);
    }

    setSuggestedSettings(null); // Hide suggestion box
}, [settings]);

const handleIgnoreSuggestion = useCallback(() => {
    setSuggestedSettings(null);
}, []);

    const availableColors = useMemo(() => {
        return settings.materials.find(m => m.id === selectedMaterialId)?.colors ?? [];
    }, [settings.materials, selectedMaterialId]);

    // Effect to handle color selection when material changes
    useEffect(() => {
        // If the currently selected color is not in the new list of available colors,
        // or if no color is selected yet, default to the first available color.
        const isSelectedColorAvailable = availableColors.some(c => c.hex === selectedColor);
        if (!isSelectedColorAvailable) {
            setSelectedColor(availableColors[0]?.hex ?? '');
        }
    }, [availableColors, selectedColor]);


  const isModelVisible = !!modelUrl;
  const isAnalysisPending = step === 'ANALYZE' && (status === 'ANALYZING' || status === 'ESTIMATING_SUPPORT');
  const isUnsupportedPreview = useMemo(() => {
    if (!file) return false;
    const lowerName = file.name.toLowerCase();
    return lowerName.endsWith('.stp') || lowerName.endsWith('.step');
  }, [file]);

  const { finalPrice, discountAmount, totalMaterialCost, totalMachineCost } = useMemo(() => {
    if (!rawQuote || !quantity || !quoteData) return { finalPrice: 0, discountAmount: 0, totalMaterialCost: 0, totalMachineCost: 0 };
    
    const totalHours = rawQuote.time_hours * quantity;
    
    const applicableTier = settings.pricingTiers
        .sort((a,b) => a.from_hours - b.from_hours)
        .find(tier => totalHours >= tier.from_hours && totalHours < tier.to_hours);

    const discountPercent = applicableTier ? applicableTier.discount_percent : 0;
    
    const singleMachineCost = quoteData.machine_time_cost;
    const singleMaterialCost = quoteData.material_cost;

    const totalMachineCost = singleMachineCost * quantity;
    const totalMaterialCost = singleMaterialCost * quantity;
    
    const calculatedDiscount = totalMachineCost * (discountPercent / 100);
    const finalMachineCost = totalMachineCost - calculatedDiscount;
    
    let finalCalculatedPrice = totalMaterialCost + finalMachineCost;
    
    // Rounding logic for different currencies
    if (language === 'fa') {
        finalCalculatedPrice = Math.ceil(finalCalculatedPrice / 1000) * 1000; // Round to nearest 1000 Toman
    } else {
        finalCalculatedPrice = parseFloat(finalCalculatedPrice.toFixed(2)); // Round to 2 decimal places for USD
    }

    return {
        finalPrice: finalCalculatedPrice,
        discountAmount: calculatedDiscount,
        totalMaterialCost,
        totalMachineCost,
    };

  }, [rawQuote, quantity, quoteData, settings.pricingTiers, language]);

  const quoteIsStale = useMemo(() => {
    if (step !== 'QUOTE' || !quotedOptions) {
        return false;
    }
    const currentOptions: QuotedOptions = {
        materialId: selectedMaterialId,
        nozzleId: selectedNozzleId,
        layerHeight: selectedLayerHeight,
        infill: selectedInfill,
        wallCount: selectedWallCount,
        quantity: quantity,
    };
    return JSON.stringify(currentOptions) !== JSON.stringify(quotedOptions);
  }, [step, quotedOptions, selectedMaterialId, selectedNozzleId, selectedLayerHeight, selectedInfill, selectedWallCount, quantity]);


  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-100 p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <AILogoIcon className="h-10 w-10 text-teal-500 dark:text-teal-400" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-200">
              {t('app_title')}
            </h1>
          </div>
          
          <div className="flex items-center">
            <LanguageToggle language={language} toggleLanguage={handleLanguageToggle} />
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            <div
              onClick={handleAdminClick}
              className="w-12 h-12 cursor-pointer"
              aria-label={t('admin_panel_hidden_label')}
            />
          </div>
        </header>
        
        <ProgressBar currentStep={step} />

        {isLoginModalOpen && (
            <LoginModal
                correctPassword={settings.adminPassword}
                onLoginSuccess={handleLoginSuccess}
                onClose={() => setIsLoginModalOpen(false)}
            />
        )}

        {isAdminPanelOpen && (
          <AdminPanel
            currentSettings={settings}
            onSave={handleSettingsSave}
            onClose={() => setIsAdminPanelOpen(false)}
          />
        )}

        <main className={`grid grid-cols-1 lg:grid-cols-5 gap-8 ${isAdminPanelOpen || isLoginModalOpen ? 'blur-sm' : ''}`}>
          <div className="lg:col-span-2 bg-white dark:bg-gray-900/50 rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700 backdrop-blur-sm flex flex-col">
            <div className="space-y-6 flex-grow">
              {step === 'UPLOAD' && !file && (
                <FileUploader onFileSelect={handleFileSelect} disabled={false} />
              )}
              
              {file && step === 'UPLOAD' && (
                <>
                  <div className="p-4 rounded-lg bg-gray-200/50 dark:bg-gray-800/50">
                    <h3 className="font-bold text-lg mb-2 text-gray-600 dark:text-gray-300">{t('selected_file_title')}</h3>
                    <p className="text-teal-600 dark:text-teal-400 break-all">{file.name}</p>
                  </div>
                  {originalValidationResult && <ModelInfoDisplay result={originalValidationResult} />}
                  <div className="p-4 rounded-lg bg-gray-200/50 dark:bg-gray-800/50 space-y-2">
                    <h3 className="font-bold text-lg text-gray-600 dark:text-gray-300">{t('auto_orientation_title')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        {t('auto_orientation_desc')}
                    </p>
                    <ActionButton 
                        onClick={handleFindOptimalOrientation} 
                        isLoading={status === AppStatus.ORIENTING}
                        className="bg-indigo-600 hover:bg-indigo-700"
                    >
                        {t('auto_orientation_button')}
                    </ActionButton>
                    {orientationError && <p className="text-red-500 dark:text-red-400 text-sm text-center pt-1">{orientationError}</p>}
                  </div>
                  <OrientationControl setRotation={setRotation} />
                  <ActionButton onClick={handleProceedToAnalysis}>
                    {t('button_next_step_analyze')}
                  </ActionButton>
                </>
              )}

              {step !== 'UPLOAD' && (
                 <AnalysisStatus 
                    status={status} 
                    result={validationResult} 
                    wasRepaired={wasRepaired}
                    apiError={apiError}
                    aiSupportPercent={aiSupportPercent}
                  />
              )}

              {step === 'ANALYZE' && (
                <div className="flex flex-col sm:flex-row-reverse gap-3 mt-4">
                  {status === AppStatus.SUCCESS && (
                    <>
                      <ActionButton onClick={handleProceedToOptions} className="sm:flex-1">
                        {t('button_next_step_options')}
                      </ActionButton>
                      <BackButton onClick={handleGoBack}>{t('button_previous_step')}</BackButton>
                    </>
                  )}
                  {status === AppStatus.REPAIR_PROMPT && (
                    <>
                      <ActionButton onClick={handleAttemptRepair} className="bg-yellow-500 hover:bg-yellow-600 sm:flex-1">
                        {t('button_attempt_repair')}
                      </ActionButton>
                       <BackButton onClick={handleGoBack}>{t('button_previous_step')}</BackButton>
                    </>
                  )}
                </div>
              )}

              {step === 'OPTIONS' && (
                <>
                  <SettingsOptimizer
                    optimizationPrompt={optimizationPrompt}
                    onOptimizationPromptChange={setOptimizationPrompt}
                    onOptimize={handleGetSuggestedSettings}
                    onApply={handleApplySuggestedSettings}
                    onIgnore={handleIgnoreSuggestion}
                    status={status}
                    suggestion={suggestedSettings}
                    apiError={apiError}
                  />
                  <div className="flex flex-col sm:flex-row-reverse gap-3 mt-6">
                    <ActionButton 
                      onClick={handleRequestQuote} 
                      className="sm:flex-1"
                      disabled={status === AppStatus.OPTIMIZING_SETTINGS}
                    >
                      {t('button_request_quote')}
                    </ActionButton>
                    <BackButton onClick={handleGoBack}>{t('button_previous_step')}</BackButton>
                  </div>
                </>
              )}

              {step === 'QUOTE' && (
                 <>
                  <QuoteDisplay 
                    quote={quoteIsStale ? null : quoteData} 
                    isLoading={status === AppStatus.QUOTING}
                    quantity={quantity}
                    discountAmount={discountAmount}
                    finalPrice={finalPrice}
                    totalMaterialCost={totalMaterialCost}
                    totalMachineCost={totalMachineCost}
                    speedAdjustment={rawQuote?.speedScalingFactor}
                  />
                  
                  <div className="flex flex-col sm:flex-row-reverse gap-3 mt-6">
                    {quoteIsStale && (
                        <ActionButton 
                            onClick={() => setShouldCalculate(true)} 
                            isLoading={status === AppStatus.QUOTING} 
                            className="sm:flex-1"
                        >
                            {t('button_update_quote')}
                        </ActionButton>
                    )}
                    <BackButton onClick={handleGoBack}>{t('button_previous_step')}</BackButton>
                  </div>
                </>
              )}
            </div>

            {file && (
                <button
                    onClick={handleReset}
                    className="w-full text-center text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200 mt-6 pt-4 border-t border-gray-200 dark:border-gray-800"
                >
                    {t('button_restart')}
                </button>
            )}
          </div>
          <div className="lg:col-span-3 flex flex-col gap-6">
            <div className="min-h-[400px] lg:h-[55vh] bg-gray-200 dark:bg-gray-900/50 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 relative overflow-hidden">
                {(isModelVisible || isAnalysisPending) && !isUnsupportedPreview ? (
                    <ThreeDViewer 
                      modelUrl={modelUrl!} 
                      fileType={file?.name.split('.').pop() || ''} 
                      rotation={rotation}
                      onModelLoad={handleModelLoad}
                      onDimensionsUpdate={handleDimensionsUpdate}
                      enabled={analysisStarted.current}
                      validationResult={validationResult}
                      highlightingEnabled={step !== 'UPLOAD'}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-600 dark:text-gray-500 p-4 text-center">
                        {isUnsupportedPreview ? (
                            <>
                               <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                               <p className="mt-4 text-lg text-gray-700 dark:text-gray-400">{t('viewer_unsupported_title')}</p>
                               <p className="mt-1 text-sm">{t('viewer_unsupported_desc')}</p>
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2 18.28V22h3.72l14.92-14.92a1.21 1.21 0 0 0 0-1.72Z"/><path d="m14 6 6 6"/><path d="M12 22h8.28"/><path d="m18 16 2-2"/><path d="m16 8-2-2"/></svg>
                                <p className="mt-4 text-lg">{t('viewer_placeholder')}</p>
                            </>
                        )}
                    </div>
                )}
            </div>
            
            {(step === 'OPTIONS' || step === 'QUOTE') && (
                <div className="bg-white dark:bg-gray-900/50 rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
                    <PrintOptions
                        settings={settings}
                        selectedMaterialId={selectedMaterialId}
                        onMaterialChange={setSelectedMaterialId}
                        selectedNozzleId={selectedNozzleId}
                        onNozzleChange={setSelectedNozzleId}
                        selectedLayerHeight={selectedLayerHeight}
                        onLayerHeightChange={setSelectedLayerHeight}
                        selectedInfill={selectedInfill}
                        onInfillChange={setSelectedInfill}
                        selectedWallCount={selectedWallCount}
                        onWallCountChange={setSelectedWallCount}
                        selectedColor={selectedColor}
                        onColorChange={setSelectedColor}
                        availableColors={availableColors}
                        disabled={status === AppStatus.OPTIMIZING_SETTINGS || status === AppStatus.QUOTING}
                        dimensions={validationResult?.dimensions_mm}
                    />

                    {step === 'QUOTE' && (
                        <div className="mt-4">
                            <label htmlFor="quantity-input" className="block text-lg font-bold mb-2 text-gray-600 dark:text-gray-300">
                              {t('quantity_label')}
                            </label>
                            <input
                              type="number"
                              id="quantity-input"
                              value={quantity}
                              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                              min="1"
                              disabled={status === AppStatus.QUOTING}
                              className="w-full p-3 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-teal-500 dark:focus:border-teal-400 outline-none transition"
                              aria-label={t('quantity_label')}
                            />
                        </div>
                    )}
                </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;