import React from 'react';

export const NozzleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M8 3H16V7H8V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M10 7L8 16H16L14 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 16L10 21H14L15 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

export const LayerHeightIcon: React.FC<{ value: number } & React.SVGProps<SVGSVGElement>> = ({ value, ...props }) => {
    const baseThickness = 0.5;
    const thicknessRange = 1.5;
    const valueRange = 0.28 - 0.16;
    const normalizedValue = (0.28 - value) / valueRange; // 0.16 -> 1, 0.28 -> 0
    const thickness = baseThickness + normalizedValue * thicknessRange;

    return (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g stroke="currentColor" strokeLinecap="round">
                <path d="M4 7H20" strokeWidth={thickness * 0.6} />
                <path d="M4 12H20" strokeWidth={thickness * 0.8} />
                <path d="M4 17H20" strokeWidth={thickness} />
            </g>
        </svg>
    );
};


export const InfillIcon: React.FC<{ value: number } & React.SVGProps<SVGSVGElement>> = ({ value, ...props }) => {
    const step = value <= 15 ? 7 : value <= 30 ? 5 : 3.5;
    const lines = [];
    for (let i = -24; i <= 24; i += step) {
        lines.push(<path key={`d1-${i}`} d={`M${i} -2 L${i+28} 26`} />);
        lines.push(<path key={`d2-${i}`} d={`M${i+28} -2 L${i} 26`} />);
    }
    return (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <defs>
                <clipPath id="infill-clip-path">
                    <rect x="4" y="4" width="16" height="16" />
                </clipPath>
            </defs>
            <rect x="4" y="4" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="transparent" />
            <g clipPath="url(#infill-clip-path)" stroke="currentColor" strokeWidth="1.5">
                {lines}
            </g>
        </svg>
    );
};


export const WallCountIcon: React.FC<{ value: number } & React.SVGProps<SVGSVGElement>> = ({ value, ...props }) => {
    const walls = [];
    for (let i = 0; i < value; i++) {
        const offset = i * 3;
        walls.push(
            <rect key={i} x={3 + offset} y={3 + offset} width={18 - offset * 2} height={18 - offset * 2} stroke="currentColor" strokeWidth="2" fill="transparent" rx="1" />
        );
    }
    return (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
           {walls}
        </svg>
    );
};