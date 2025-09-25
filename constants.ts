import type { Color } from './types';

// This is the master list of all possible colors the admin can choose from.
export const PREDEFINED_COLORS: Color[] = [
    { id: 'white', name: 'سفید', nameKey: 'color_white', hex: '#f0f0f0' },
    { id: 'black', name: 'مشکی', nameKey: 'color_black', hex: '#1a1a1a' },
    { id: 'transparent', name: 'شفاف', nameKey: 'color_transparent', hex: '#e5e5e5' },
    { id: 'gray', name: 'خاکستری', nameKey: 'color_gray', hex: '#808080' },
    { id: 'red', name: 'قرمز', nameKey: 'color_red', hex: '#e63946' },
    { id: 'blue', name: 'آبی', nameKey: 'color_blue', hex: '#457b9d' },
    { id: 'green', name: 'سبز', nameKey: 'color_green', hex: '#52b788' },
];


export const ACCEPTED_FORMATS = ".stl,.obj,.3mf,.stp,.step";