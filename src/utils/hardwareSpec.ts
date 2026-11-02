export type SubsystemCategory = 'all' | 'display' | 'sensor' | 'power';

export interface PinConnection {
  id: string;
  espPin: string;
  gpioNumber: number | null;
  peripheral: 'GC9A01 Display' | 'DHT11 Sensor' | 'Power Bus';
  targetPin: string;
  signalName: string;
  direction: 'Output' | 'Bi-directional' | 'Supply' | 'Ground';
  subsystem: Exclude<SubsystemCategory, 'all'>;
  firmwareRef: string;
  wireColorHex: string;
  wireColorName: string;
  electricalNote: string;
}

export const PIN_CONNECTIONS: PinConnection[] = [
  {
    id: 'spi-sclk',
    espPin: 'GPIO 4',
    gpioNumber: 4,
    peripheral: 'GC9A01 Display',
    targetPin: 'SCL / SCK',
    signalName: 'SPI2 Master Clock',
    direction: 'Output',
    subsystem: 'display',
    firmwareRef: 'cfg.pin_sclk = 4',
    wireColorHex: '#F59E0B',
    wireColorName: 'Amber',
    electricalNote: '20 MHz write clock (cfg.freq_write = 20000000) to prevent 2.4GHz Wi-Fi antenna harmonic interference.'
  },
  {
    id: 'spi-mosi',
    espPin: 'GPIO 6',
    gpioNumber: 6,
    peripheral: 'GC9A01 Display',
    targetPin: 'SDA / MOSI',
    signalName: 'SPI2 Master Out Slave In',
    direction: 'Output',
    subsystem: 'display',
    firmwareRef: 'cfg.pin_mosi = 6',
    wireColorHex: '#10B981',
    wireColorName: 'Emerald',
    electricalNote: 'High-speed RGB565 pixel stream; MISO is unassigned (cfg.pin_miso = -1).'
  },
  {
    id: 'spi-dc',
    espPin: 'GPIO 1',
    gpioNumber: 1,
    peripheral: 'GC9A01 Display',
    targetPin: 'DC',
    signalName: 'Data / Command Select',
    direction: 'Output',
    subsystem: 'display',
    firmwareRef: 'cfg.pin_dc = 1',
    wireColorHex: '#38BDF8',
    wireColorName: 'Cyan',
    electricalNote: 'LOW = Command register write, HIGH = Graphic RAM pixel data write.'
  },
  {
    id: 'spi-cs',
    espPin: 'GPIO 7',
    gpioNumber: 7,
    peripheral: 'GC9A01 Display',
    targetPin: 'CS',
    signalName: 'Chip Select (Active Low)',
    direction: 'Output',
    subsystem: 'display',
    firmwareRef: 'pc.pin_cs = 7',
    wireColorHex: '#A855F7',
    wireColorName: 'Violet',
    electricalNote: 'Pulled LOW during active LovyanGFX SPI transactions.'
  },
  {
    id: 'spi-rst',
    espPin: 'GPIO 0',
    gpioNumber: 0,
    peripheral: 'GC9A01 Display',
    targetPin: 'RST / RES',
    signalName: 'Hardware Reset',
    direction: 'Output',
    subsystem: 'display',
    firmwareRef: 'pc.pin_rst = 0',
    wireColorHex: '#EC4899',
    wireColorName: 'Pink',
    electricalNote: 'Toggled during tft.init() to reset the GC9A01 controller state machine.'
  },
  {
    id: 'dht-data',
    espPin: 'GPIO 3',
    gpioNumber: 3,
    peripheral: 'DHT11 Sensor',
    targetPin: 'DATA / OUT',
    signalName: '1-Wire Digital Telemetry',
    direction: 'Bi-directional',
    subsystem: 'sensor',
    firmwareRef: '#define DHT_PIN 3',
    wireColorHex: '#22D3EE',
    wireColorName: 'Teal',
    electricalNote: 'Polled asynchronously every 2500ms. Requires a 10kΩ pull-up resistor to 3.3V.'
  },
  {
    id: 'pwr-3v3',
    espPin: '3V3',
    gpioNumber: null,
    peripheral: 'Power Bus',
    targetPin: 'GC9A01 VCC + DHT11 VCC',
    signalName: '+3.3V Regulated Rail',
    direction: 'Supply',
    subsystem: 'power',
    firmwareRef: 'WIFI_POWER_8_5dBm',
    wireColorHex: '#EF4444',
    wireColorName: 'Red',
    electricalNote: '3.3V logic and backlight supply. Wi-Fi TX capped at 8.5 dBm to eliminate rail droop.'
  },
  {
    id: 'pwr-gnd',
    espPin: 'GND',
    gpioNumber: null,
    peripheral: 'Power Bus',
    targetPin: 'GC9A01 GND + DHT11 GND',
    signalName: 'Common Ground Reference',
    direction: 'Ground',
    subsystem: 'power',
    firmwareRef: 'COMMON_GND',
    wireColorHex: '#64748B',
    wireColorName: 'Slate',
    electricalNote: 'Shared return path for SPI clock integrity and DHT11 single-wire timing.'
  }
];

export function filterPinConnections(
  connections: PinConnection[],
  subsystem: SubsystemCategory,
  searchQuery: string
): PinConnection[] {
  const q = searchQuery.trim().toLowerCase();
  return connections.filter((conn) => {
    const matchesCategory = subsystem === 'all' || conn.subsystem === subsystem;
    if (!matchesCategory) return false;
    if (!q) return true;
    return (
      conn.espPin.toLowerCase().includes(q) ||
      conn.targetPin.toLowerCase().includes(q) ||
      conn.signalName.toLowerCase().includes(q) ||
      conn.peripheral.toLowerCase().includes(q) ||
      conn.firmwareRef.toLowerCase().includes(q) ||
      conn.electricalNote.toLowerCase().includes(q)
    );
  });
}

// =====================================================
// COLOR SPECTRUM SYSTEM (Exact C++ RGB565 Constants)
// =====================================================
export const RGB565_PALETTE = {
  BLACK: 0x0000,
  NAVY: 0x0861,
  CYAN: 0x07FF,
  BLUE: 0x249F,
  WHITE: 0xFFFF,
  YELLOW: 0xFFE0,
  GREEN: 0x07E0,
  RED: 0xF800,
  GREY: 0x8410,
  PINK: 0xF81F,
  PURPLE: 0xA81F
} as const;

export const CSS_PALETTE = {
  BLACK: '#000000',
  NAVY: '#081028',
  CYAN: '#00FFFF',
  BLUE: '#2494FF',
  WHITE: '#FFFFFF',
  YELLOW: '#FFFF00',
  GREEN: '#00FF00',
  RED: '#FF0000',
  GREY: '#848284',
  PINK: '#FF00FF',
  PURPLE: '#A800FF'
} as const;

export const EMOTION_NAMES = [
  'NEUTRAL',
  'HAPPY',
  'SAD',
  'ANGRY',
  'SLEEPY',
  'SURPRISED',
  'CURIOUS',
  'CONFUSED',
  'EXCITED',
  'SUSPICIOUS',
  'SCARED',
  'LOVE',
  'DIZZY',
  'THINKING',
  'CRYING',
  'PLAYFUL',
  'TIRED',
  'DETERMINED'
] as const;

export type EmotionName = (typeof EMOTION_NAMES)[number];

export interface EmotionRenderParams {
  index: number;
  name: EmotionName;
  w: number;
  h: number;
  ey: number;
  gx: number;
  gy: number;
  colorHex: string;
  rgb565: number;
  forcedClosed: boolean;
  description: string;
}

export function getEmotionRenderParams(
  emotion: EmotionName,
  baseGazeX = 0,
  baseGazeY = 0
): EmotionRenderParams {
  const index = EMOTION_NAMES.indexOf(emotion);
  let w = 64;
  let h = 54;
  const ey = 116;
  let gx = baseGazeX;
  let gy = baseGazeY;
  let colorHex: string = CSS_PALETTE.CYAN;
  let rgb565: number = RGB565_PALETTE.CYAN;
  let forcedClosed = false;
  let description = 'Balanced cyan eyes with specular highlight';

  switch (emotion) {
    case 'HAPPY':
      w = 64;
      h = 38;
      description = 'Compressed cheerful eyes with pink cheek blush lines';
      break;
    case 'SAD':
      w = 64;
      h = 49;
      gy = 4;
      colorHex = CSS_PALETTE.BLUE;
      rgb565 = RGB565_PALETTE.BLUE;
      description = 'Downcast gaze (gy=4) with blue outer eyelid droop';
      break;
    case 'ANGRY':
      w = 64;
      h = 43;
      colorHex = CSS_PALETTE.BLUE;
      rgb565 = RGB565_PALETTE.BLUE;
      description = 'Furrowed V-eyebrows with sharp upper-inner triangle mask';
      break;
    case 'SLEEPY':
      w = 64;
      h = 32;
      forcedClosed = true;
      colorHex = CSS_PALETTE.BLUE;
      rgb565 = RGB565_PALETTE.BLUE;
      description = 'Forced closed curved arc eyelids in deep blue';
      break;
    case 'SURPRISED':
      w = 58;
      h = 62;
      description = 'Tall widened eyes (58x62) with raised horizontal brows';
      break;
    case 'CURIOUS':
      w = 60;
      h = 50;
      gx = 7;
      description = 'Asymmetric inquisitive brow with right-shifted gaze (gx=7)';
      break;
    case 'CONFUSED':
      w = 64;
      h = 45;
      gx = -4;
      description = 'Tilted eyebrows with leftward gaze shift (gx=-4)';
      break;
    case 'EXCITED':
      w = 64;
      h = 58;
      colorHex = CSS_PALETTE.YELLOW;
      rgb565 = RGB565_PALETTE.YELLOW;
      description = 'Vibrant yellow eyes with ringed pupils and corner sparkles';
      break;
    case 'SUSPICIOUS':
      w = 64;
      h = 36;
      gx = 8;
      colorHex = CSS_PALETTE.BLUE;
      rgb565 = RGB565_PALETTE.BLUE;
      description = 'Narrowed squint (h=36) with side-eye glance (gx=8)';
      break;
    case 'SCARED':
      w = 58;
      h = 60;
      colorHex = CSS_PALETTE.BLUE;
      rgb565 = RGB565_PALETTE.BLUE;
      description = 'Wide blue eyes with circular open mouth (r=8)';
      break;
    case 'LOVE':
      w = 64;
      h = 52;
      colorHex = CSS_PALETTE.PINK;
      rgb565 = RGB565_PALETTE.PINK;
      description = 'Pink eyes with heart-shaped pupils and floating corner hearts';
      break;
    case 'DIZZY':
      w = 64;
      h = 52;
      colorHex = CSS_PALETTE.PURPLE;
      rgb565 = RGB565_PALETTE.PURPLE;
      description = 'Purple eyes with crossed X pupils and concentric mouth rings';
      break;
    case 'THINKING':
      w = 64;
      h = 48;
      gx = 9;
      gy = -5;
      description = 'Upward-right pondering gaze (gx=9, gy=-5) with thought bubbles';
      break;
    case 'CRYING':
      w = 64;
      h = 44;
      colorHex = CSS_PALETTE.BLUE;
      rgb565 = RGB565_PALETTE.BLUE;
      description = 'Sad sloped eyebrows with cyan teardrop triangles on cheeks';
      break;
    case 'PLAYFUL':
      w = 64;
      h = 45;
      gx = -5;
      description = 'Playful side glance (gx=-5) with pink V-shaped smile';
      break;
    case 'TIRED':
      w = 64;
      h = 32;
      colorHex = CSS_PALETTE.BLUE;
      rgb565 = RGB565_PALETTE.BLUE;
      description = 'Heavy upper eyelid occlusion covering top third of eye';
      break;
    case 'DETERMINED':
      w = 64;
      h = 42;
      colorHex = CSS_PALETTE.BLUE;
      rgb565 = RGB565_PALETTE.BLUE;
      description = 'Focused angled brows and determined upper eyelid cut';
      break;
    default:
      break;
  }

  return {
    index: index === -1 ? 0 : index,
    name: emotion,
    w,
    h,
    ey,
    gx,
    gy,
    colorHex,
    rgb565,
    forcedClosed,
    description
  };
}

export function rgb888ToRgb565(r: number, g: number, b: number): number {
  const r5 = (Math.max(0, Math.min(255, Math.round(r))) >> 3) & 0x1f;
  const g6 = (Math.max(0, Math.min(255, Math.round(g))) >> 2) & 0x3f;
  const b5 = (Math.max(0, Math.min(255, Math.round(b))) >> 3) & 0x1f;
  return (r5 << 11) | (g6 << 5) | b5;
}

export function formatRgb565Hex(val: number): string {
  return '0x' + (val & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

export function generateRgb565HeaderSnippet(
  pixels: number[],
  arrayName = 'iot_maker_logo_240',
  width = 240,
  height = 240
): string {
  const total = width * height;
  const rows: string[] = [];
  const perLine = 16;
  for (let i = 0; i < Math.min(pixels.length, total); i += perLine) {
    const slice = pixels.slice(i, i + perLine).map(formatRgb565Hex);
    rows.push('  ' + slice.join(', '));
  }
  return [
    '#pragma once',
    '#include <Arduino.h>',
    '#include <pgmspace.h>',
    '',
    `// Generated ${width}x${height} RGB565 Bitmap (${total} pixels)`,
    `const uint16_t ${arrayName}[${total}] PROGMEM = {`,
    rows.join(',\n'),
    '};',
    ''
  ].join('\n');
}

export interface GitHubPushPayload {
  token: string;
  repoName: string;
  description?: string;
  isPrivate?: boolean;
  branch?: string;
  commitMessage?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateGitHubPushInput(input: Partial<GitHubPushPayload>): ValidationResult {
  const errors: Record<string, string> = {};
  const token = (input.token ?? '').trim();
  const repoName = (input.repoName ?? '').trim();

  if (!token) {
    errors.token = 'GitHub Personal Access Token is required to authenticate with GitHub.';
  } else if (token.length < 10) {
    errors.token = 'Token appears too short. Provide a classic (ghp_...) or fine-grained (github_pat_...) token.';
  }

  if (!repoName) {
    errors.repoName = 'Repository name is required.';
  } else if (!/^[a-zA-Z0-9._-]+$/.test(repoName)) {
    errors.repoName = 'Repository name may only contain letters, digits, hyphens, underscores, and periods.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}
