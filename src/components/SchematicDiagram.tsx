import React, { useState } from 'react';
import {
  PIN_CONNECTIONS,
  PinConnection,
  SubsystemCategory,
  filterPinConnections
} from '../utils/hardwareSpec';
import { Download, Check, Copy, Cpu, Radio, Zap } from 'lucide-react';

interface SchematicDiagramProps {
  onDownloadSvg: () => void;
}

export const SchematicDiagram: React.FC<SchematicDiagramProps> = ({ onDownloadSvg }) => {
  const [selectedSubsystem, setSelectedSubsystem] = useState<SubsystemCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNetId, setActiveNetId] = useState<string | null>(null);
  const [copiedAscii, setCopiedAscii] = useState(false);

  const filteredConnections = filterPinConnections(
    PIN_CONNECTIONS,
    selectedSubsystem,
    searchQuery
  );

  const activeConnection: PinConnection | undefined =
    PIN_CONNECTIONS.find((c) => c.id === activeNetId) ?? filteredConnections[0];

  const isNetHighlighted = (id: string) => {
    if (activeNetId) return activeNetId === id;
    if (selectedSubsystem !== 'all') {
      const conn = PIN_CONNECTIONS.find((c) => c.id === id);
      return conn?.subsystem === selectedSubsystem;
    }
    return true;
  };

  const netOpacity = (id: string) => (isNetHighlighted(id) ? 1 : 0.2);
  const netStrokeWidth = (id: string) => (activeNetId === id ? 3.5 : 2.5);

  const asciiSchematic = `                       +------------------------------+
                       |         ESP32-C3 MCU         |
                       |     (SuperMini / DevKitM)    |
                       +------------------------------+
                       |                         3.3V +---------+------------------+
                       |                          GND +-----+---|--------------+   |
                       |        SPI2_HOST (20MHz)     |     |   |              |   |
                       |               GPIO 4 (SCLK)  +-----|-- | --------+    |   |
                       |               GPIO 6 (MOSI)  +-----|-- | ------+ |    |   |
                       |               GPIO 1 (DC)    +-----|-- | ----+ | |    |   |
                       |               GPIO 7 (CS)    +-----|-- | --+ | | |    |   |
                       |               GPIO 0 (RST)   +-----|-- | + | | | |    |   |
                       |        1-WIRE SENSOR         |     |   | | | | | |    |   |
                       |               GPIO 3 (DATA)  +---+ |   | | | | | |    |   |
                       +------------------------------+   | |   | | | | | |    |   |
                                                          v v   v v v v v v    v   v
                                                     [DHT11 Sensor]   [GC9A01 240x240 TFT]`;

  const handleCopyAscii = () => {
    navigator.clipboard.writeText(asciiSchematic);
    setCopiedAscii(true);
    setTimeout(() => setCopiedAscii(false), 1800);
  };

  return (
    <section id="schematic" className="scroll-mt-24 space-y-8">
      {/* Header & Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-slate-800 pb-6">
        <div>
          <p className="text-xs font-mono text-cyan-400 tracking-wide">
            01. Hardware Architecture &amp; Pinout Mapping
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mt-1">
            Interactive Schematic &amp; Connection Diagram
          </h2>
          <p className="text-sm text-slate-400 mt-2 max-w-2xl">
            Click any wire trace or pin row to inspect its signal path, LovyanGFX register binding, and RF/SPI electrical isolation notes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Subsystem Segmented Filter */}
          <div
            role="group"
            aria-label="Filter schematic connections by subsystem"
            className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg"
          >
            {(
              [
                { id: 'all', label: 'All Nets (8)' },
                { id: 'display', label: 'GC9A01 SPI (5)' },
                { id: 'sensor', label: 'DHT11 (1)' },
                { id: 'power', label: 'Power Rails (2)' }
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedSubsystem(tab.id);
                  setActiveNetId(null);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  selectedSubsystem === tab.id
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onDownloadSvg}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-200 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 hover:border-slate-600 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            Download Schematic SVG
          </button>
        </div>
      </div>

      {/* Interactive SVG Canvas */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span>MCU: ESP32-C3 (SPI2_HOST)</span>
            <span aria-hidden="true">·</span>
            <span>Display: GC9A01 240x240 RGB565</span>
            <span aria-hidden="true">·</span>
            <span>Sensor: DHT11 (GPIO 3)</span>
          </div>
          {activeNetId && (
            <button
              type="button"
              onClick={() => setActiveNetId(null)}
              className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0"
            >
              Reset Net Highlight
            </button>
          )}
        </div>

        <div className="w-full overflow-x-auto">
          <svg
            viewBox="0 0 1100 620"
            className="w-full h-auto min-w-[780px] select-none rounded-lg"
            role="img"
            aria-label="Interactive wiring schematic connecting ESP32-C3 to GC9A01 240x240 SPI TFT display and DHT11 sensor"
          >
            <defs>
              <linearGradient id="schemBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#090D16" />
                <stop offset="100%" stopColor="#0F172A" />
              </linearGradient>
              <pattern id="schemGrid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path
                  d="M 24 0 L 0 0 0 24"
                  fill="none"
                  stroke="#1E293B"
                  strokeWidth="0.75"
                />
              </pattern>
            </defs>

            <rect width="1100" height="620" fill="url(#schemBg)" rx="10" />
            <rect width="1100" height="620" fill="url(#schemGrid)" rx="10" />
            <rect
              x="10"
              y="10"
              width="1080"
              height="600"
              fill="none"
              stroke="#334155"
              strokeWidth="1.25"
              rx="8"
            />

            {/* +3.3V Regulated Power Rail */}
            <g
              className="cursor-pointer"
              onClick={() => setActiveNetId(activeNetId === 'pwr-3v3' ? null : 'pwr-3v3')}
              opacity={netOpacity('pwr-3v3')}
            >
              <path
                d="M 280 65 L 920 65"
                fill="none"
                stroke="#EF4444"
                strokeWidth={netStrokeWidth('pwr-3v3')}
                strokeDasharray="6 3"
              />
              <text x="285" y="54" fill="#FCA5A5" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
                +3.3V VCC REGULATED RAIL (MAX 8.5 dBm TX LOAD)
              </text>
              <path
                d="M 326 184 L 354 184 L 354 65"
                fill="none"
                stroke="#EF4444"
                strokeWidth={netStrokeWidth('pwr-3v3')}
              />
              <circle cx="354" cy="65" r="4.5" fill="#EF4444" />
              <path
                d="M 684 149 L 656 149 L 656 65"
                fill="none"
                stroke="#EF4444"
                strokeWidth={netStrokeWidth('pwr-3v3')}
              />
              <circle cx="656" cy="65" r="4.5" fill="#EF4444" />
              <path
                d="M 684 428 L 656 428 L 656 149"
                fill="none"
                stroke="#EF4444"
                strokeWidth={netStrokeWidth('pwr-3v3')}
              />
              <circle cx="656" cy="149" r="4" fill="#EF4444" />
            </g>

            {/* Common GND Rail */}
            <g
              className="cursor-pointer"
              onClick={() => setActiveNetId(activeNetId === 'pwr-gnd' ? null : 'pwr-gnd')}
              opacity={netOpacity('pwr-gnd')}
            >
              <path
                d="M 280 555 L 920 555"
                fill="none"
                stroke="#64748B"
                strokeWidth={netStrokeWidth('pwr-gnd')}
                strokeDasharray="6 3"
              />
              <text x="285" y="576" fill="#94A3B8" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
                COMMON GROUND REFERENCE (GND)
              </text>
              <path
                d="M 326 462 L 354 462 L 354 555"
                fill="none"
                stroke="#64748B"
                strokeWidth={netStrokeWidth('pwr-gnd')}
              />
              <circle cx="354" cy="555" r="4.5" fill="#64748B" />
              <path
                d="M 684 177 L 670 177 L 670 555"
                fill="none"
                stroke="#64748B"
                strokeWidth={netStrokeWidth('pwr-gnd')}
              />
              <circle cx="670" cy="555" r="4.5" fill="#64748B" />
              <path
                d="M 684 488 L 670 488"
                fill="none"
                stroke="#64748B"
                strokeWidth={netStrokeWidth('pwr-gnd')}
              />
              <circle cx="670" cy="488" r="4" fill="#64748B" />
            </g>

            {/* SPI SCLK (GPIO 4) */}
            <g
              className="cursor-pointer"
              onClick={() => setActiveNetId(activeNetId === 'spi-sclk' ? null : 'spi-sclk')}
              opacity={netOpacity('spi-sclk')}
            >
              <path
                d="M 326 234 L 590 234 L 590 209 L 684 209"
                fill="none"
                stroke="#F59E0B"
                strokeWidth={netStrokeWidth('spi-sclk')}
              />
              <text x="372" y="226" fill="#FDE68A" fontSize="10.5" fontFamily="JetBrains Mono, monospace" fontWeight="600">
                GPIO 4 → SCL (20MHz SCLK)
              </text>
            </g>

            {/* SPI MOSI (GPIO 6) */}
            <g
              className="cursor-pointer"
              onClick={() => setActiveNetId(activeNetId === 'spi-mosi' ? null : 'spi-mosi')}
              opacity={netOpacity('spi-mosi')}
            >
              <path
                d="M 326 274 L 605 274 L 605 249 L 684 249"
                fill="none"
                stroke="#10B981"
                strokeWidth={netStrokeWidth('spi-mosi')}
              />
              <text x="372" y="266" fill="#A7F3D0" fontSize="10.5" fontFamily="JetBrains Mono, monospace" fontWeight="600">
                GPIO 6 → SDA (SPI MOSI)
              </text>
            </g>

            {/* SPI DC (GPIO 1) */}
            <g
              className="cursor-pointer"
              onClick={() => setActiveNetId(activeNetId === 'spi-dc' ? null : 'spi-dc')}
              opacity={netOpacity('spi-dc')}
            >
              <path
                d="M 326 314 L 620 314 L 620 289 L 684 289"
                fill="none"
                stroke="#38BDF8"
                strokeWidth={netStrokeWidth('spi-dc')}
              />
              <text x="372" y="306" fill="#BAE6FD" fontSize="10.5" fontFamily="JetBrains Mono, monospace" fontWeight="600">
                GPIO 1 → DC (Data/Cmd)
              </text>
            </g>

            {/* SPI CS (GPIO 7) */}
            <g
              className="cursor-pointer"
              onClick={() => setActiveNetId(activeNetId === 'spi-cs' ? null : 'spi-cs')}
              opacity={netOpacity('spi-cs')}
            >
              <path
                d="M 326 354 L 632 354 L 632 329 L 684 329"
                fill="none"
                stroke="#A855F7"
                strokeWidth={netStrokeWidth('spi-cs')}
              />
              <text x="372" y="346" fill="#E9D5FF" fontSize="10.5" fontFamily="JetBrains Mono, monospace" fontWeight="600">
                GPIO 7 → CS (Chip Select)
              </text>
            </g>

            {/* SPI RST (GPIO 0) */}
            <g
              className="cursor-pointer"
              onClick={() => setActiveNetId(activeNetId === 'spi-rst' ? null : 'spi-rst')}
              opacity={netOpacity('spi-rst')}
            >
              <path
                d="M 326 394 L 644 394 L 644 359 L 684 359"
                fill="none"
                stroke="#EC4899"
                strokeWidth={netStrokeWidth('spi-rst')}
              />
              <text x="372" y="386" fill="#FBCFE8" fontSize="10.5" fontFamily="JetBrains Mono, monospace" fontWeight="600">
                GPIO 0 → RST (Hardware Reset)
              </text>
            </g>

            {/* DHT11 DATA (GPIO 3) */}
            <g
              className="cursor-pointer"
              onClick={() => setActiveNetId(activeNetId === 'dht-data' ? null : 'dht-data')}
              opacity={netOpacity('dht-data')}
            >
              <path
                d="M 326 434 L 580 434 L 580 458 L 684 458"
                fill="none"
                stroke="#22D3EE"
                strokeWidth={netStrokeWidth('dht-data')}
              />
              <text x="372" y="426" fill="#CFFAFE" fontSize="10.5" fontFamily="JetBrains Mono, monospace" fontWeight="600">
                GPIO 3 → DHT11 DATA (1-Wire)
              </text>
            </g>

            {/* MODULE 1: ESP32-C3 MCU */}
            <g transform="translate(60, 110)">
              <rect
                x="0"
                y="0"
                width="260"
                height="375"
                fill="#0F172A"
                stroke="#38BDF8"
                strokeWidth="2"
                rx="10"
              />
              <rect
                x="16"
                y="16"
                width="228"
                height="44"
                fill="#1E293B"
                stroke="#334155"
                rx="6"
              />
              <text
                x="130"
                y="36"
                fill="#38BDF8"
                fontSize="14"
                fontFamily="Outfit, sans-serif"
                fontWeight="bold"
                textAnchor="middle"
              >
                ESP32-C3 MCU
              </text>
              <text
                x="130"
                y="52"
                fill="#94A3B8"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
              >
                RISC-V · SPI2_HOST · Wi-Fi STA
              </text>

              <text x="20" y="92" fill="#64748B" fontSize="10" fontFamily="JetBrains Mono, monospace">
                FIRMWARE PARAMETERS:
              </text>
              <text x="20" y="110" fill="#CBD5E1" fontSize="10" fontFamily="JetBrains Mono, monospace">
                • freq_write: 20 MHz
              </text>
              <text x="20" y="126" fill="#CBD5E1" fontSize="10" fontFamily="JetBrains Mono, monospace">
                • freq_read: 16 MHz
              </text>
              <text x="20" y="142" fill="#CBD5E1" fontSize="10" fontFamily="JetBrains Mono, monospace">
                • pin_miso: -1 (Unused)
              </text>
              <text x="20" y="158" fill="#CBD5E1" fontSize="10" fontFamily="JetBrains Mono, monospace">
                • TX Power: 8.5 dBm
              </text>
              <text x="20" y="174" fill="#CBD5E1" fontSize="10" fontFamily="JetBrains Mono, monospace">
                • NTP: pool.ntp.org
              </text>

              {/* Pins on ESP32-C3 */}
              <rect x="248" y="68" width="18" height="12" fill="#EF4444" rx="2" />
              <text x="240" y="78" fill="#FCA5A5" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="bold" textAnchor="end">
                3V3
              </text>

              <rect x="248" y="118" width="18" height="12" fill="#F59E0B" rx="2" />
              <text x="240" y="128" fill="#FDE68A" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="bold" textAnchor="end">
                GPIO 4
              </text>

              <rect x="248" y="158" width="18" height="12" fill="#10B981" rx="2" />
              <text x="240" y="168" fill="#A7F3D0" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="bold" textAnchor="end">
                GPIO 6
              </text>

              <rect x="248" y="198" width="18" height="12" fill="#38BDF8" rx="2" />
              <text x="240" y="208" fill="#BAE6FD" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="bold" textAnchor="end">
                GPIO 1
              </text>

              <rect x="248" y="238" width="18" height="12" fill="#A855F7" rx="2" />
              <text x="240" y="248" fill="#E9D5FF" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="bold" textAnchor="end">
                GPIO 7
              </text>

              <rect x="248" y="278" width="18" height="12" fill="#EC4899" rx="2" />
              <text x="240" y="288" fill="#FBCFE8" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="bold" textAnchor="end">
                GPIO 0
              </text>

              <rect x="248" y="318" width="18" height="12" fill="#22D3EE" rx="2" />
              <text x="240" y="328" fill="#CFFAFE" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="bold" textAnchor="end">
                GPIO 3
              </text>

              <rect x="248" y="346" width="18" height="12" fill="#64748B" rx="2" />
              <text x="240" y="356" fill="#CBD5E1" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="bold" textAnchor="end">
                GND
              </text>
            </g>

            {/* MODULE 2: GC9A01 240x240 ROUND TFT */}
            <g transform="translate(690, 95)">
              <rect
                x="0"
                y="0"
                width="345"
                height="280"
                fill="#0F172A"
                stroke="#38BDF8"
                strokeWidth="2"
                rx="10"
              />
              <text
                x="220"
                y="28"
                fill="#F8FAFC"
                fontSize="14"
                fontFamily="Outfit, sans-serif"
                fontWeight="bold"
                textAnchor="middle"
              >
                GC9A01 ROUND SPI TFT
              </text>
              <text
                x="220"
                y="45"
                fill="#94A3B8"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
              >
                240×240 RGB565 · invert=true
              </text>

              {/* Mini Display Graphic */}
              <circle cx="230" cy="155" r="82" fill="#000000" stroke="#1E3A8A" strokeWidth="3" />
              <circle cx="230" cy="155" r="76" fill="none" stroke="#0EA5E9" strokeWidth="1" strokeDasharray="4 2" />
              <rect x="184" y="128" width="32" height="26" rx="7" fill="#00FFFF" />
              <circle cx="200" cy="141" r="5" fill="#000000" />
              <circle cx="198" cy="139" r="2" fill="#FFFFFF" />
              <rect x="244" y="128" width="32" height="26" rx="7" fill="#00FFFF" />
              <circle cx="260" cy="141" r="5" fill="#000000" />
              <circle cx="258" cy="139" r="2" fill="#FFFFFF" />
              <text x="230" y="202" fill="#38BDF8" fontSize="9" fontFamily="JetBrains Mono, monospace" textAnchor="middle">
                THE IoT MAKER
              </text>

              {/* Pins */}
              <rect x="-6" y="48" width="18" height="12" fill="#EF4444" rx="2" />
              <text x="20" y="58" fill="#FCA5A5" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
                VCC (3.3V)
              </text>

              <rect x="-6" y="76" width="18" height="12" fill="#64748B" rx="2" />
              <text x="20" y="86" fill="#CBD5E1" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
                GND
              </text>

              <rect x="-6" y="108" width="18" height="12" fill="#F59E0B" rx="2" />
              <text x="20" y="118" fill="#FDE68A" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
                SCL / SCK
              </text>

              <rect x="-6" y="148" width="18" height="12" fill="#10B981" rx="2" />
              <text x="20" y="158" fill="#A7F3D0" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
                SDA / MOSI
              </text>

              <rect x="-6" y="188" width="18" height="12" fill="#38BDF8" rx="2" />
              <text x="20" y="198" fill="#BAE6FD" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
                DC
              </text>

              <rect x="-6" y="228" width="18" height="12" fill="#A855F7" rx="2" />
              <text x="20" y="238" fill="#E9D5FF" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
                CS
              </text>

              <rect x="-6" y="256" width="18" height="12" fill="#EC4899" rx="2" />
              <text x="20" y="266" fill="#FBCFE8" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
                RST / RES
              </text>
            </g>

            {/* MODULE 3: DHT11 SENSOR */}
            <g transform="translate(690, 400)">
              <rect
                x="0"
                y="0"
                width="345"
                height="115"
                fill="#0F172A"
                stroke="#22D3EE"
                strokeWidth="2"
                rx="10"
              />
              <text
                x="205"
                y="28"
                fill="#22D3EE"
                fontSize="14"
                fontFamily="Outfit, sans-serif"
                fontWeight="bold"
                textAnchor="middle"
              >
                DHT11 SENSOR MODULE
              </text>
              <text
                x="205"
                y="46"
                fill="#94A3B8"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
              >
                Temperature (°C) &amp; Humidity (%)
              </text>
              <text
                x="205"
                y="68"
                fill="#CBD5E1"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
              >
                Polling Interval: 2500ms Async
              </text>
              <text
                x="205"
                y="86"
                fill="#64748B"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
              >
                10kΩ Pull-up DATA → 3.3V
              </text>

              <rect x="-6" y="22" width="18" height="12" fill="#EF4444" rx="2" />
              <text x="20" y="32" fill="#FCA5A5" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
                VCC (3.3V)
              </text>

              <rect x="-6" y="52" width="18" height="12" fill="#22D3EE" rx="2" />
              <text x="20" y="62" fill="#CFFAFE" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
                DATA (OUT)
              </text>

              <rect x="-6" y="82" width="18" height="12" fill="#64748B" rx="2" />
              <text x="20" y="92" fill="#CBD5E1" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
                GND
              </text>
            </g>
          </svg>
        </div>

        {/* Selected Net Inspector Bar */}
        {activeConnection && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <span
                className="w-3 h-3 rounded-sm shrink-0 mt-1 sm:mt-0"
                style={{ backgroundColor: activeConnection.wireColorHex }}
              />
              <div>
                <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-100">
                  <span className="font-mono text-cyan-400">{activeConnection.espPin}</span>
                  <span className="text-slate-500">→</span>
                  <span className="font-mono text-slate-200">
                    {activeConnection.peripheral} ({activeConnection.targetPin})
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-xs font-mono text-slate-400">
                    {activeConnection.firmwareRef}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{activeConnection.electricalNote}</p>
              </div>
            </div>
            <div className="text-xs font-mono text-slate-400 shrink-0">
              Wire: {activeConnection.wireColorName} · {activeConnection.direction}
            </div>
          </div>
        )}
      </div>

      {/* Pinout Mapping Table + Hardware Engineering Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 sm:px-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Pinout &amp; Register Connection Matrix
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Click any row to highlight its trace on the schematic above.
              </p>
            </div>
            <div className="w-full sm:w-64">
              <label htmlFor="pin-search-input" className="sr-only">
                Search pins or signals
              </label>
              <input
                id="pin-search-input"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search GPIO, MOSI, DHT11..."
                className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 bg-slate-950/50">
                  <th className="py-2.5 px-4">ESP32-C3 Pin</th>
                  <th className="py-2.5 px-4">Target Pin</th>
                  <th className="py-2.5 px-4">Signal Role</th>
                  <th className="py-2.5 px-4">Code Constant</th>
                  <th className="py-2.5 px-4 text-right">Direction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs">
                {filteredConnections.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No pin connections match "{searchQuery}".{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedSubsystem('all');
                        }}
                        className="text-cyan-400 underline ml-1"
                      >
                        Reset filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredConnections.map((conn) => {
                    const isSelected = activeNetId === conn.id;
                    return (
                      <tr
                        key={conn.id}
                        onClick={() => setActiveNetId(isSelected ? null : conn.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-cyan-500/10 text-white'
                            : 'hover:bg-slate-800/60 text-slate-300'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-semibold whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-2.5 h-2.5 rounded-xs shrink-0"
                              style={{ backgroundColor: conn.wireColorHex }}
                            />
                            <span className="text-slate-100">{conn.espPin}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-200 whitespace-nowrap">
                          {conn.targetPin}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-200">{conn.signalName}</div>
                          <div className="text-[11px] text-slate-400">{conn.peripheral}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-cyan-400 whitespace-nowrap">
                          {conn.firmwareRef}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400 text-right whitespace-nowrap">
                          {conn.direction}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: RF/SPI Engineering Notes & ASCII Diagram */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-base font-semibold text-slate-100">
              Electrical &amp; RF Design Notes
            </h3>
            <div className="space-y-3.5 text-xs text-slate-300">
              <div className="flex items-start gap-3">
                <Radio className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-100">
                    8.5 dBm Wi-Fi TX Power Limiting
                  </div>
                  <p className="text-slate-400 mt-0.5 leading-relaxed">
                    Compact ESP32-C3 boards suffer from 3.3V regulator droop and SPI clock ringing during full 20 dBm Wi-Fi bursts. Setting{' '}
                    <code className="font-mono text-cyan-300">WIFI_POWER_8_5dBm</code> stabilizes both NTP sync and TFT transfers.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t border-slate-800/80">
                <Cpu className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-100">
                    20 MHz SPI2 Write Clock &amp; Zero Sprite RAM
                  </div>
                  <p className="text-slate-400 mt-0.5 leading-relaxed">
                    Instead of a 240×240×2B (115.2 KB) RAM framebuffer, primitives draw directly to the GC9A01 over{' '}
                    <code className="font-mono text-amber-300">SPI2_HOST</code> at 20 MHz, preventing heap fragmentation.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t border-slate-800/80">
                <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-100">
                    DHT11 1-Wire Pull-Up Requirement
                  </div>
                  <p className="text-slate-400 mt-0.5 leading-relaxed">
                    If using a bare 4-pin DHT11 sensor, place a <code className="font-mono text-emerald-300">10kΩ</code> resistor between <code className="font-mono">GPIO 3</code> and <code className="font-mono">3.3V</code>. 3-pin breakout PCB modules include this resistor onboard.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-slate-100">
                README ASCII Wiring Block
              </h3>
              <button
                type="button"
                onClick={handleCopyAscii}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                {copiedAscii ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    Copy ASCII
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 bg-slate-950 border border-slate-800/90 rounded-lg text-[10px] leading-tight font-mono text-slate-300 overflow-x-auto">
              {asciiSchematic}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
