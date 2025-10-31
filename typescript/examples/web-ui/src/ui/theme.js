"use strict";
// Branding theme constants for APT Acceptance Agent UI
// Colors, radii, fonts, and gradients from branding.md
Object.defineProperty(exports, "__esModule", { value: true });
exports.shadow = exports.fonts = exports.radii = exports.colors = void 0;
exports.colors = {
    primary: '#1A1F71', // Visa Core
    secondary: '#0099E0', // APT Accent
    background: '#0E1116', // Dashboard BG
    surface: '#1C2129', // Card BG
    textPrimary: '#F4F6FA',
    textSecondary: '#B2B8C2',
    success: '#00C48C',
    warning: '#FFC043',
    error: '#FF4E42',
    gradientHero: 'linear-gradient(135deg, #1A1F71 0%, #0099E0 50%, #00C48C 100%)',
};
exports.radii = {
    card: '16px',
    button: '12px',
    input: '8px',
};
exports.fonts = {
    heading: 'Inter, sans-serif',
    body: 'Inter, sans-serif',
    mono: 'JetBrains Mono, monospace',
    numeric: 'IBM Plex Sans Condensed, sans-serif',
};
exports.shadow = '0 4px 24px rgba(0,0,0,0.2)';
