// FIX: Import TranslationKey to enforce type safety for i18n keys.
import { Type } from "@google/genai";
import type { TranslationKey } from "./i18n/translations";

export interface Price {
  toman: number;
  usd: number;
}

export interface Option {
  id: string;
  display_name: string;
  // FIX: Use TranslationKey type for i18n keys.
  displayNameKey?: TranslationKey; // For i18n
  value: number; // For nozzles/layerHeights this is mm, for infills this is %
}

export interface Color {
  id: string;
  name: string;
  // FIX: Use TranslationKey type for i18n keys.
  nameKey?: TranslationKey; // For i18n
  hex: string;
}

export interface Material {
  id: string;
  name: string;
  // FIX: Use TranslationKey type for i18n keys.
  nameKey?: TranslationKey; // For i18n
  price_per_kg: Price;
  density_g_cm3: number;
  max_size_mm: { x: number; y: number; z: number; };
  speed_modifier_percent: number;
  max_flow_rate_mm3_s?: number;
  colors: Color[];
}

export interface PricingTier {
  id:string;
  from_hours: number;
  to_hours: number; // Use Infinity for the last tier
  discount_percent: number;
}

export interface Settings {
  adminPassword: string;
  materials: Material[];
  nozzles: Option[];
  layerHeights: Option[];
  infills: Option[];
  wallCounts: Option[];
  pricingTiers: PricingTier[];
  machineRatePerHour: Price;
  // New detailed slicer settings for deterministic local calculation
  speed_wall_mm_s: number;
  speed_infill_mm_s: number;
  speed_top_bottom_mm_s: number;
  speed_travel_mm_s: number;
  support_overhead_percent: number;
  acceleration_overhead_factor: number;
}


export interface ValidationResult {
  is_printable: boolean;
  errors: string[];
  volume_cm3?: number;
  dimensions_mm?: { x: number; y: number; z: number };
  is_repairable?: boolean;
}

export interface QuoteData {
  time: string;
  material: number;
  price: number;
  material_cost: number;
  machine_time_cost: number;
}

export enum AppStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  REPAIR_PROMPT = 'REPAIR_PROMPT',
  REPAIRING = 'REPAIRING',
  QUOTING = 'QUOTING',
  ORIENTING = 'ORIENTING',
  OPTIMIZING_SETTINGS = 'OPTIMIZING_SETTINGS',
  ESTIMATING_SUPPORT = 'ESTIMATING_SUPPORT',
}

// --- Gemini API Response Schemas ---

export const SUPPORT_ESTIMATION_RESPONSE_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        support_overhead_percent: { 
            type: Type.NUMBER, 
            description: "A single number representing the estimated percentage of the model's volume that will require support structures. E.g., for a complex figurine, return 25. For a simple box, return 0."
        },
        reasoning: { 
            type: Type.STRING, 
            description: "A brief explanation for why this percentage was chosen." 
        },
    },
    required: ["support_overhead_percent", "reasoning"]
};

export const SUGGESTED_SETTINGS_RESPONSE_SCHEMA = {
    type: Type.OBJECT,
    properties: {
      material_id: { type: Type.STRING, description: "The ID of the suggested material (e.g., 'pla', 'petg'). Must be one of the provided IDs." },
      nozzle_diameter_mm: { type: Type.NUMBER, description: "The suggested nozzle diameter in millimeters (e.g., 0.4, 0.6). Must be one of the provided values." },
      layer_height_mm: { type: Type.NUMBER, description: "The suggested layer height in millimeters (e.g., 0.16, 0.20). Must be one of the provided values." },
      infill_percent: { type: Type.NUMBER, description: "The suggested infill percentage (e.g., 15, 30). Must be one of the provided values." },
      wall_count: { type: Type.NUMBER, description: "The suggested number of walls (e.g., 2, 3). Must be one of the provided values." },
      reasoning: { type: Type.STRING, description: "A brief, user-friendly explanation for why these settings were chosen based on the user's request." },
    },
    required: ["material_id", "nozzle_diameter_mm", "layer_height_mm", "infill_percent", "wall_count", "reasoning"]
};

export const OPTIMAL_ORIENTATION_RESPONSE_SCHEMA = {
    type: Type.OBJECT,
    properties: {
      rotation_degrees: {
        type: Type.OBJECT,
        properties: {
          x: { type: Type.NUMBER, description: "Rotation in degrees around the X axis." },
          y: { type: Type.NUMBER, description: "Rotation in degrees around the Y axis." },
          z: { type: Type.NUMBER, description: "Rotation in degrees around the Z axis." },
        },
        required: ["x", "y", "z"]
      },
      reasoning: { type: Type.STRING, description: "A brief explanation for the chosen orientation." },
    },
    required: ["rotation_degrees", "reasoning"]
  };

export const ANALYSIS_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    is_printable: { type: Type.BOOLEAN },
    is_repairable: { type: Type.BOOLEAN },
    errors: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    dimensions_mm: {
      type: Type.OBJECT,
      properties: {
        x: { type: Type.NUMBER },
        y: { type: Type.NUMBER },
        z: { type: Type.NUMBER },
      },
      required: ["x", "y", "z"]
    },
    volume_cm3: { type: Type.NUMBER },
  },
  required: ["is_printable", "is_repairable", "errors", "dimensions_mm", "volume_cm3"]
};