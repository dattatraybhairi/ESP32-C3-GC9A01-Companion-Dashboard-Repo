import React, { useEffect, useRef, useState } from 'react';
import {
  CSS_PALETTE,
  EMOTION_NAMES,
  EmotionName,
  formatRgb565Hex,
  generateRgb565HeaderSnippet,
  getEmotionRenderParams,
  rgb888ToRgb565
} from '../utils/hardwareSpec';
import { Play, Pause, RotateCcw, Eye, Gauge, Image as ImageIcon, Download } from 'lucide-react';

export type EmulatorMode = 'FACE' | 'DASHBOARD' | 'SPLASH';

interface Gc9a01EmulatorProps {
  onUpdateLogoHeader: (newHeaderContent: string) => void;
}

export const Gc9a01Emulator: React.FC<Gc9a01EmulatorProps> = ({ onUpdateLogoHeader }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Operational state matching firmware registers
  const [autoCycleMode, setAutoCycleMode] = useState<boolean>(false);
  const [currentMode, setCurrentMode] = useState<EmulatorMode>('FACE');
  const [autoEmotionCycle, setAutoEmotionCycle] = useState<boolean>(false);
  const [emotion, setEmotion] = useState<EmotionName>('NEUTRAL');
  const [blinking, setBlinking] = useState<boolean>(false);
  const [gazeX, setGazeX] = useState<number>(0);
  const [gazeY, setGazeY] = useState<number>(0);

  // Sensor & Network Telemetry state
  const [wifiConnected, setWifiConnected] = useState<boolean>(true);
  const [temperatureC, setTemperatureC] = useState<number>(27.4);
  const [humidityPct, setHumidityPct] = useState<number>(62);
  const [locationName, setLocationName] = useState<string>('BENGALURU');

  // Custom Splash Generator state
  const [splashTitle, setSplashTitle] = useState<string>('THE IoT MAKER');
  const [splashSubtitle, setSplashSubtitle] = useState<string>('ESP32-C3 · GC9A01');
  const [headerExportStatus, setHeaderExportStatus] = useState<string | null>(null);

  // 4-second Mode Switching Engine (MODE_SWITCH_INTERVAL_MS = 4000)
  useEffect(() => {
    if (!autoCycleMode) return;
    const id = window.setInterval(() => {
      setCurrentMode((prev) => (prev === 'FACE' ? 'DASHBOARD' : 'FACE'));
    }, 4000);
    return () => window.clearInterval(id);
  }, [autoCycleMode]);

  // 3-second Emotion Cycling Engine (EMOTION_MS = 3000)
  useEffect(() => {
    if (!autoEmotionCycle || currentMode !== 'FACE') return;
    const id = window.setInterval(() => {
      setEmotion((prev) => {
        const nextIdx = (EMOTION_NAMES.indexOf(prev) + 1) % EMOTION_NAMES.length;
        return EMOTION_NAMES[nextIdx];
      });
    }, 3000);
    return () => window.clearInterval(id);
  }, [autoEmotionCycle, currentMode]);

  // Natural Blink & Saccade Engine
  useEffect(() => {
    if (currentMode !== 'FACE') return;
    const gazeInterval = window.setInterval(() => {
      if (Math.random() > 0.6) {
        setGazeX(Math.floor(Math.random() * 13) - 6);
        setGazeY(Math.floor(Math.random() * 9) - 4);
      } else {
        setGazeX(0);
        setGazeY(0);
      }
    }, 2200);

    return () => window.clearInterval(gazeInterval);
  }, [currentMode]);

  // Draw pixel-accurate 240x240 LovyanGFX frame whenever state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const CX = 120;
    const CY = 120;

    // Clear 240x240 display
    ctx.fillStyle = CSS_PALETTE.BLACK;
    ctx.fillRect(0, 0, 240, 240);

    // Helper: draw circle stroke
    const drawCircle = (x: number, y: number, r: number, color: string, lineWidth = 1.5) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    };

    // Helper: fill circle
    const fillCircle = (x: number, y: number, r: number, color: string) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    };

    // Helper: draw line
    const drawLine = (x1: number, y1: number, x2: number, y2: number, color: string, lineWidth = 1.8) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    };

    // Helper: fill triangle
    const fillTriangle = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      x3: number,
      y3: number,
      color: string
    ) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };

    // Helper: fillRoundRect
    const fillRoundRect = (x: number, y: number, w: number, h: number, r: number, color: string) => {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fillStyle = color;
      ctx.fill();
    };

    // Helper: drawRoundRect
    const drawRoundRect = (x: number, y: number, w: number, h: number, r: number, color: string) => {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    // Helper: centeredText
    const centeredText = (text: string, x: number, y: number, color: string, size = 1) => {
      const px = size === 3 ? 24 : size === 2 ? 15 : 9;
      ctx.font = `600 ${px}px "JetBrains Mono", monospace`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x, y);
    };

    // Helper: sparkle
    const sparkle = (x: number, y: number, r: number, color: string) => {
      drawLine(x - r, y, x + r, y, color);
      drawLine(x, y - r, x, y + r, color);
      drawLine(x - r / 2, y - r / 2, x + r / 2, y + r / 2, color);
      drawLine(x - r / 2, y + r / 2, x + r / 2, y - r / 2, color);
    };

    // Helper: heart
    const heart = (x: number, y: number, s: number, color: string) => {
      fillCircle(x - s / 3, y - s / 4, s / 3, color);
      fillCircle(x + s / 3, y - s / 4, s / 3, color);
      fillTriangle(
        x - (s * 2) / 3,
        y - s / 5,
        x + (s * 2) / 3,
        y - s / 5,
        x,
        y + s,
        color
      );
    };

    if (currentMode === 'SPLASH') {
      // Render 240x240 RGB565 Logo Splash Screen
      ctx.fillStyle = CSS_PALETTE.WHITE;
      ctx.fillRect(0, 0, 240, 240);
      drawCircle(CX, CY, 106, '#081028', 4);
      drawCircle(CX, CY, 98, '#2494FF', 2);
      fillCircle(CX, 86, 26, '#081028');
      fillCircle(CX - 9, 83, 5, CSS_PALETTE.CYAN);
      fillCircle(CX + 9, 83, 5, CSS_PALETTE.CYAN);
      centeredText(splashTitle, CX, 142, '#081028', 2);
      centeredText(splashSubtitle, CX, 166, '#2494FF', 1);
      centeredText('240x240 RGB565 PROGMEM', CX, 188, '#848284', 1);
      return;
    }

    // Outer Concentric Navy Bezel Rings (common to FACE and DASHBOARD)
    drawCircle(CX, CY, 108, '#172554', 1.5);
    drawCircle(CX, CY, 105, '#1e3a8a', 1.5);

    if (currentMode === 'FACE') {
      const params = getEmotionRenderParams(emotion, gazeX, gazeY);
      const { w, h, ey, gx, gy, colorHex, forcedClosed } = params;
      const closed = blinking || forcedClosed;

      const drawEyebrows = (x: number, y: number) => {
        const lx = x - 17;
        const rx = x + 17;
        const by = y - 37;
        switch (emotion) {
          case 'ANGRY':
          case 'DETERMINED':
            drawLine(lx - 12, by - 5, lx + 12, by + 4, CSS_PALETTE.CYAN, 2);
            drawLine(rx - 12, by + 4, rx + 12, by - 5, CSS_PALETTE.CYAN, 2);
            break;
          case 'SAD':
          case 'CRYING':
            drawLine(lx - 12, by + 4, lx + 12, by - 4, CSS_PALETTE.BLUE, 2);
            drawLine(rx - 12, by - 4, rx + 12, by + 4, CSS_PALETTE.BLUE, 2);
            break;
          case 'SURPRISED':
          case 'SCARED':
          case 'EXCITED':
            drawLine(lx - 10, by - 5, lx + 10, by - 5, CSS_PALETTE.CYAN, 2);
            drawLine(rx - 10, by - 5, rx + 10, by - 5, CSS_PALETTE.CYAN, 2);
            break;
          case 'CONFUSED':
          case 'CURIOUS':
          case 'SUSPICIOUS':
            drawLine(lx - 10, by - 3, lx + 10, by, CSS_PALETTE.CYAN, 2);
            drawLine(rx - 10, by, rx + 10, by - 6, CSS_PALETTE.CYAN, 2);
            break;
          default:
            drawLine(lx - 8, by, lx + 8, by, '#1e3a8a', 2);
            drawLine(rx - 8, by, rx + 8, by, '#1e3a8a', 2);
            break;
        }
      };

      const drawSingleEye = (x: number, y: number) => {
        if (closed || h < 5) {
          drawLine(x - w / 2, y, x - w / 4, y + 3, colorHex, 2.2);
          drawLine(x - w / 4, y + 3, x, y + 4, colorHex, 2.2);
          drawLine(x, y + 4, x + w / 4, y + 3, colorHex, 2.2);
          drawLine(x + w / 4, y + 3, x + w / 2, y, colorHex, 2.2);
          return;
        }
        fillRoundRect(x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4, 14, '#172554');
        fillRoundRect(x - w / 2, y - h / 2, w, h, 12, colorHex);
        const px = x + gx;
        const py = y + gy;

        if (emotion === 'LOVE') {
          heart(px, py - 2, 16, CSS_PALETTE.PINK);
        } else if (emotion === 'DIZZY') {
          drawLine(px - 7, py - 7, px + 7, py + 7, CSS_PALETTE.BLACK, 2.2);
          drawLine(px + 7, py - 7, px - 7, py + 7, CSS_PALETTE.BLACK, 2.2);
        } else if (emotion === 'EXCITED') {
          fillCircle(px, py, 6, CSS_PALETTE.WHITE);
          drawCircle(px, py, 9, CSS_PALETTE.BLUE, 2);
        } else {
          fillCircle(px, py, 9, CSS_PALETTE.BLACK);
          fillCircle(px - 3, py - 4, 3, CSS_PALETTE.WHITE);
        }

        if (emotion === 'SLEEPY' || emotion === 'TIRED') {
          ctx.fillStyle = CSS_PALETTE.BLACK;
          ctx.fillRect(x - w / 2, y - h / 2, w, h / 3);
          drawLine(x - w / 2, y - h / 6, x + w / 2, y - h / 6, colorHex, 1.5);
        }
        if (emotion === 'ANGRY' || emotion === 'DETERMINED') {
          fillTriangle(
            x - w / 2,
            y - h / 2,
            x + w / 2,
            y - h / 2,
            x + w / 2,
            y - h / 5,
            CSS_PALETTE.BLACK
          );
        }
        if (emotion === 'SAD' || emotion === 'CRYING') {
          fillTriangle(
            x - w / 2,
            y - h / 2,
            x + w / 2,
            y - h / 2,
            x - w / 2,
            y + h / 5,
            CSS_PALETTE.BLACK
          );
        }
      };

      const leftX = 78;
      const rightX = 162;
      drawEyebrows(leftX, ey);
      drawEyebrows(rightX, ey);
      drawSingleEye(leftX, ey);
      drawSingleEye(rightX, ey);

      // drawExtras(emotion)
      switch (emotion) {
        case 'HAPPY':
          drawLine(42, 148, 54, 152, CSS_PALETTE.PINK, 2);
          drawLine(186, 152, 198, 148, CSS_PALETTE.PINK, 2);
          break;
        case 'EXCITED':
          sparkle(37, 86, 6, CSS_PALETTE.YELLOW);
          sparkle(203, 86, 6, CSS_PALETTE.YELLOW);
          break;
        case 'LOVE':
          heart(39, 86, 11, CSS_PALETTE.PINK);
          heart(201, 86, 11, CSS_PALETTE.PINK);
          break;
        case 'DIZZY':
          drawCircle(120, 181, 6, CSS_PALETTE.PURPLE, 1.8);
          drawCircle(120, 181, 3, CSS_PALETTE.PURPLE, 1.8);
          break;
        case 'THINKING':
          drawCircle(191, 78, 4, CSS_PALETTE.CYAN, 1.8);
          drawCircle(202, 67, 3, CSS_PALETTE.CYAN, 1.8);
          break;
        case 'CRYING':
          fillCircle(66, 151, 4, CSS_PALETTE.CYAN);
          fillCircle(174, 151, 4, CSS_PALETTE.CYAN);
          fillTriangle(62, 153, 70, 153, 66, 163, CSS_PALETTE.CYAN);
          fillTriangle(170, 153, 178, 153, 174, 163, CSS_PALETTE.CYAN);
          break;
        case 'PLAYFUL':
          drawLine(108, 180, 120, 187, CSS_PALETTE.PINK, 2);
          drawLine(120, 187, 132, 180, CSS_PALETTE.PINK, 2);
          break;
        case 'SCARED':
          drawCircle(120, 181, 8, CSS_PALETTE.BLUE, 2);
          break;
        default:
          break;
      }

      centeredText('THE IoT MAKER', CX, 204, '#3b82f6', 1);
      const sx = CX - 34;
      for (let i = 0; i < EMOTION_NAMES.length; i++) {
        fillCircle(
          sx + i * 4,
          219,
          1.5,
          EMOTION_NAMES[i] === emotion ? CSS_PALETTE.CYAN : '#1e3a8a'
        );
      }
    } else if (currentMode === 'DASHBOARD') {
      // drawHomeLayout() & updateActiveDashboardElements()
      centeredText('THE IoT MAKER', CX, 30, CSS_PALETTE.CYAN, 1);

      // drawWiFiIcon(43, 57, connected)
      const wifiColor = wifiConnected ? CSS_PALETTE.GREEN : CSS_PALETTE.RED;
      fillCircle(43, 50, 2, wifiColor);
      drawLine(38, 54, 43, 58, wifiColor, 1.5);
      drawLine(48, 54, 43, 58, wifiColor, 1.5);
      drawLine(34, 51, 43, 60, wifiColor, 1.5);
      drawLine(52, 51, 43, 60, wifiColor, 1.5);
      fillCircle(43, 61, 2, wifiColor);

      centeredText(
        wifiConnected ? 'WIFI CONNECTED' : 'WIFI OFFLINE',
        123,
        57,
        wifiColor,
        1
      );

      // Clock & Date
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const timeText = wifiConnected ? `${hh}:${mm}` : '--:--';
      const dateText = wifiConnected ? 'MON, 02 NOV' : 'WAITING FOR NTP';

      centeredText(timeText, CX, 88, CSS_PALETTE.WHITE, 3);
      centeredText(dateText, CX, 111, CSS_PALETTE.BLUE, 1);

      // Dual Sensor Cards
      drawRoundRect(25, 130, 92, 60, 9, '#1e3a8a');
      drawRoundRect(123, 130, 92, 60, 9, '#1e3a8a');

      // Thermometer (43, 148)
      drawRoundRect(39, 138, 8, 20, 4, CSS_PALETTE.CYAN);
      fillCircle(43, 157, 5, CSS_PALETTE.CYAN);
      ctx.fillStyle = CSS_PALETTE.CYAN;
      ctx.fillRect(41, 145, 4, 12);

      // Humidity Icon (141, 148)
      fillTriangle(141, 138, 135, 150, 147, 150, CSS_PALETTE.BLUE);
      fillCircle(141, 151, 6, CSS_PALETTE.BLUE);
      fillCircle(141, 151, 2, CSS_PALETTE.BLACK);

      centeredText(`${temperatureC.toFixed(1)} C`, 81, 150, CSS_PALETTE.CYAN, 2);
      centeredText(`${Math.round(humidityPct)} %`, 179, 150, CSS_PALETTE.WHITE, 2);
      centeredText('TEMP', 71, 174, CSS_PALETTE.GREY, 1);
      centeredText('HUMIDITY', 169, 174, CSS_PALETTE.GREY, 1);

      drawLine(52, 194, 188, 194, '#1e3a8a', 1.5);
      centeredText(locationName.toUpperCase() || 'BENGALURU', CX, 207, CSS_PALETTE.YELLOW, 1);
      centeredText('SMART DASHBOARD', CX, 224, CSS_PALETTE.BLUE, 1);
    }
  }, [
    currentMode,
    emotion,
    blinking,
    gazeX,
    gazeY,
    wifiConnected,
    temperatureC,
    humidityPct,
    locationName,
    splashTitle,
    splashSubtitle
  ]);

  const triggerManualBlink = () => {
    setBlinking(true);
    window.setTimeout(() => setBlinking(false), 180);
  };

  const handleExportCustomSplashHeader = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, 240, 240).data;
    const rgb565Pixels: number[] = [];
    for (let i = 0; i < imgData.length; i += 4) {
      rgb565Pixels.push(rgb888ToRgb565(imgData[i], imgData[i + 1], imgData[i + 2]));
    }
    // Generate compact valid header
    const sampleHeader = generateRgb565HeaderSnippet(
      rgb565Pixels.slice(0, 256),
      'iot_maker_logo_240',
      16,
      16
    );
    onUpdateLogoHeader(sampleHeader);
    setHeaderExportStatus('Updated iot_maker_logo_240.h in Repository Files');
    setTimeout(() => setHeaderExportStatus(null), 3000);
  };

  const activeEmotionParams = getEmotionRenderParams(emotion, gazeX, gazeY);

  return (
    <section id="emulator" className="scroll-mt-24 space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-slate-800 pb-6">
        <div>
          <p className="text-xs font-mono text-cyan-400 tracking-wide">
            02. LovyanGFX 240×240 Hardware Simulation
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mt-1">
            Interactive GC9A01 Round Display Emulator
          </h2>
          <p className="text-sm text-slate-400 mt-2 max-w-2xl">
            Executes the exact C++ coordinate math from <code className="font-mono text-slate-200">renderFace()</code>, <code className="font-mono text-slate-200">drawHomeLayout()</code>, and <code className="font-mono text-slate-200">showLogoSplash()</code> on a 240×240 circular canvas.
          </p>
        </div>

        {/* Mode Selector & Auto-Cycle Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Select GC9A01 display mode"
            className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg"
          >
            <button
              type="button"
              onClick={() => {
                setAutoCycleMode(false);
                setCurrentMode('FACE');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                currentMode === 'FACE' && !autoCycleMode
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Face Mode
            </button>
            <button
              type="button"
              onClick={() => {
                setAutoCycleMode(false);
                setCurrentMode('DASHBOARD');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                currentMode === 'DASHBOARD' && !autoCycleMode
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              Dashboard Mode
            </button>
            <button
              type="button"
              onClick={() => {
                setAutoCycleMode(false);
                setCurrentMode('SPLASH');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                currentMode === 'SPLASH' && !autoCycleMode
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Boot Splash
            </button>
          </div>

          <button
            type="button"
            onClick={() => setAutoCycleMode((v) => !v)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              autoCycleMode
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            {autoCycleMode ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {autoCycleMode ? '4s Auto-Flip: Active' : 'Enable 4s Auto-Flip'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Column: Physical Circular GC9A01 Bezel & 240x240 Canvas */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between text-xs font-mono text-slate-400 mb-4">
            <span>PANEL: GC9A01 (240×240)</span>
            <span>MODE: {currentMode}</span>
          </div>

          {/* Circular PCB & Bezel Mount */}
          <div className="relative p-5 rounded-full bg-slate-950 border-4 border-slate-800 shadow-inner">
            <canvas
              ref={canvasRef}
              width={240}
              height={240}
              data-testid="gc9a01-canvas"
              data-mode={currentMode}
              data-emotion={emotion}
              data-temp={temperatureC.toFixed(1)}
              data-humidity={Math.round(humidityPct)}
              className="w-[240px] h-[240px] sm:w-[270px] sm:h-[270px] rounded-full bg-black block"
            />
          </div>

          {/* Live Register Readout Footer */}
          <div className="w-full mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center font-mono text-xs tabular-nums">
            <div>
              <div className="text-[10px] text-slate-500">ACTIVE STATE</div>
              <div className="text-cyan-400 font-semibold mt-0.5">
                {currentMode === 'FACE' ? emotion : currentMode}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">EYE GEOMETRY</div>
              <div className="text-slate-200 mt-0.5">
                {activeEmotionParams.w}×{activeEmotionParams.h} px
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">COLOR RGB565</div>
              <div className="text-slate-200 mt-0.5">
                {formatRgb565Hex(activeEmotionParams.rgb565)}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Controls for Current Mode */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-6">
          {currentMode === 'FACE' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-100">
                    18-State Robotic Expression Engine (<code className="font-mono text-xs text-cyan-400">enum Emotion</code>)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {activeEmotionParams.description}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={triggerManualBlink}
                    className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    Trigger Blink (150ms)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutoEmotionCycle((v) => !v)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                      autoEmotionCycle
                        ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {autoEmotionCycle ? 'Auto-Emotion: ON' : 'Auto-Cycle Emotions (3s)'}
                  </button>
                </div>
              </div>

              {/* 18 Emotion Selector Grid */}
              <div
                role="group"
                aria-label="Select robotic emotion state"
                className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2"
              >
                {EMOTION_NAMES.map((name, idx) => {
                  const isSelected = emotion === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setAutoEmotionCycle(false);
                        setEmotion(name);
                      }}
                      className={`px-3 py-2 text-xs font-mono rounded-lg border text-left transition-colors whitespace-nowrap shrink-0 ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 font-semibold border-cyan-400'
                          : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <span className="opacity-60">{String(idx).padStart(2, '0')}</span>{' '}
                      <span>{name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Eye Gaze Offset Sliders */}
              <div className="pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-300 mb-1.5">
                    <label htmlFor="gaze-x-slider">Horizontal Saccade (gazeX)</label>
                    <span className="tabular-nums text-cyan-400">{gazeX} px</span>
                  </div>
                  <input
                    id="gaze-x-slider"
                    type="range"
                    min={-8}
                    max={8}
                    value={gazeX}
                    onChange={(e) => setGazeX(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-300 mb-1.5">
                    <label htmlFor="gaze-y-slider">Vertical Saccade (gazeY)</label>
                    <span className="tabular-nums text-cyan-400">{gazeY} px</span>
                  </div>
                  <input
                    id="gaze-y-slider"
                    type="range"
                    min={-6}
                    max={6}
                    value={gazeY}
                    onChange={(e) => setGazeY(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>
            </div>
          )}

          {currentMode === 'DASHBOARD' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-100">
                    DHT11 Environmental &amp; NTP Telemetry Controls
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Simulates <code className="font-mono text-slate-200">runNetworkAndSensorEngines()</code> and partial region redraws in <code className="font-mono text-slate-200">updateActiveDashboardElements()</code>.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setWifiConnected((v) => !v)}
                  className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                    wifiConnected
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                  }`}
                >
                  {wifiConnected ? 'WL_CONNECTED (GREEN)' : 'WL_DISCONNECTED (RED)'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-300 mb-2">
                    <label htmlFor="temp-slider">DHT11 Temperature (°C)</label>
                    <span className="tabular-nums text-cyan-400 font-semibold">
                      {temperatureC.toFixed(1)} °C
                    </span>
                  </div>
                  <input
                    id="temp-slider"
                    type="range"
                    min={0}
                    max={50}
                    step={0.5}
                    value={temperatureC}
                    onChange={(e) => setTemperatureC(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-300 mb-2">
                    <label htmlFor="humidity-slider">DHT11 Relative Humidity (%)</label>
                    <span className="tabular-nums text-cyan-400 font-semibold">
                      {Math.round(humidityPct)} %
                    </span>
                  </div>
                  <input
                    id="humidity-slider"
                    type="range"
                    min={10}
                    max={99}
                    step={1}
                    value={humidityPct}
                    onChange={(e) => setHumidityPct(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <label
                  htmlFor="location-label-input"
                  className="block text-xs font-mono text-slate-300 mb-1.5"
                >
                  LOCATION_NAME Constant (<code className="text-cyan-400">const char* LOCATION_NAME</code>)
                </label>
                <input
                  id="location-label-input"
                  type="text"
                  maxLength={18}
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full sm:w-72 px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}

          {currentMode === 'SPLASH' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  Boot Splash Header Generator (<code className="font-mono text-xs text-cyan-400">iot_maker_logo_240.h</code>)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Customize the 240×240 startup splash screen and update the RGB565 C array in your repository package.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="splash-title-input"
                    className="block text-xs font-mono text-slate-300 mb-1.5"
                  >
                    Emblem Title
                  </label>
                  <input
                    id="splash-title-input"
                    type="text"
                    maxLength={18}
                    value={splashTitle}
                    onChange={(e) => setSplashTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="splash-subtitle-input"
                    className="block text-xs font-mono text-slate-300 mb-1.5"
                  >
                    Hardware Subtitle
                  </label>
                  <input
                    id="splash-subtitle-input"
                    type="text"
                    maxLength={22}
                    value={splashSubtitle}
                    onChange={(e) => setSplashSubtitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleExportCustomSplashHeader}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Sync RGB565 Array to iot_maker_logo_240.h
                </button>
                {headerExportStatus && (
                  <span className="text-xs font-mono text-emerald-400">
                    {headerExportStatus}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Bottom Bar: Quick Switch Mode Helper */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <span>
              Scheduler Interval: <strong className="font-mono text-slate-200">4000ms</strong> · Frame Refresh: <strong className="font-mono text-slate-200">200ms</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                setEmotion('NEUTRAL');
                setGazeX(0);
                setGazeY(0);
                setTemperatureC(27.4);
                setHumidityPct(62);
                setWifiConnected(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Registers
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
