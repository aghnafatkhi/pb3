export interface Participant {
  id: 'p1' | 'p2';
  name: string;
  isReady: boolean;
  photoUrl: string | null;
  lastSeen: number;
  cameraActive: boolean;
}

export type FrameThemeId = 'blush' | 'matcha' | 'lavender' | 'sunset' | 'minimal' | 'vintage' | 'y2k';
export type FrameLayoutId = 'split-side' | 'split-vertical' | 'strip-4';
export type FilterId = 'normal' | 'soft-warm' | 'bw-classic' | 'pastel-glow' | 'retro-film';

export interface RoomState {
  code: string;
  createdAt: number;
  updatedAt: number;
  status: 'lobby' | 'counting' | 'captured';
  countdownStartTime: number | null;
  p1: Participant | null;
  p2: Participant | null;
  frameTheme: FrameThemeId;
  frameLayout: FrameLayoutId;
  stickerTheme: string;
  filterId: FilterId;
  customTitle: string;
  customDate: string;
}

export interface FrameThemeConfig {
  id: FrameThemeId;
  name: string;
  bgClass: string;
  bgHex: string;
  textColor: string;
  borderColor: string;
  accentColor: string;
}

export const FRAME_THEMES: Record<FrameThemeId, FrameThemeConfig> = {
  blush: {
    id: 'blush',
    name: 'Blush Pink 🌸',
    bgClass: 'bg-rose-100',
    bgHex: '#ffe4e6',
    textColor: '#9f1239',
    borderColor: '#fecdd3',
    accentColor: '#fb7185',
  },
  matcha: {
    id: 'matcha',
    name: 'Soft Matcha 🍵',
    bgClass: 'bg-emerald-100',
    bgHex: '#d1fae5',
    textColor: '#065f46',
    borderColor: '#a7f3d0',
    accentColor: '#34d399',
  },
  lavender: {
    id: 'lavender',
    name: 'Cloud Lavender 💜',
    bgClass: 'bg-purple-100',
    bgHex: '#f3e8ff',
    textColor: '#6b21a8',
    borderColor: '#e9d5ff',
    accentColor: '#c084fc',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Peach 🍑',
    bgClass: 'bg-amber-100',
    bgHex: '#fef3c7',
    textColor: '#92400e',
    borderColor: '#fde68a',
    accentColor: '#fbbf24',
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal White 🤍',
    bgClass: 'bg-slate-50',
    bgHex: '#f8fafc',
    textColor: '#1e293b',
    borderColor: '#e2e8f0',
    accentColor: '#64748b',
  },
  vintage: {
    id: 'vintage',
    name: 'Retro Noir 🎞️',
    bgClass: 'bg-stone-900',
    bgHex: '#1c1917',
    textColor: '#f5f5f4',
    borderColor: '#44403c',
    accentColor: '#a8a29e',
  },
  y2k: {
    id: 'y2k',
    name: 'Y2K Sparkle ✨',
    bgClass: 'bg-sky-100',
    bgHex: '#e0f2fe',
    textColor: '#075985',
    borderColor: '#bae6fd',
    accentColor: '#38bdf8',
  },
};
