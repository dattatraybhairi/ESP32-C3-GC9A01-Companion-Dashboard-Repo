/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DEFAULT_REPO_FILES, RepoFileEntry } from './utils/repoFiles';
import { SchematicDiagram } from './components/SchematicDiagram';
import { Gc9a01Emulator } from './components/Gc9a01Emulator';
import { RepoExplorerAndPush } from './components/RepoExplorerAndPush';
import { Download, FolderGit2, ArrowDownRight } from 'lucide-react';

const SCHEMATIC_SVG_FILE_CONTENT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 680" width="1100" height="680" font-family="'JetBrains Mono', 'Courier New', monospace">
  <rect width="1100" height="680" fill="#090D16" rx="12" />
  <rect x="12" y="12" width="1076" height="656" fill="none" stroke="#334155" stroke-width="1.5" rx="8" />
  <text x="52" y="54" fill="#F8FAFC" font-size="16" font-weight="bold">HARDWARE SCHEMATIC &amp; WIRING DIAGRAM — ESP32-C3 + GC9A01 (240x240 SPI) + DHT11</text>
  <text x="52" y="74" fill="#94A3B8" font-size="11">Bus: SPI2_HOST @ 20MHz Write | Radio TX: WIFI_POWER_8_5dBm | Supply: 3.3V Logic Regulated | THE IoT MAKER</text>
  <path d="M 280 135 L 920 135" fill="none" stroke="#EF4444" stroke-width="2.5" stroke-dasharray="6 3" />
  <text x="285" y="126" fill="#EF4444" font-size="11" font-weight="bold">+3.3V VCC RAIL (REGULATED)</text>
  <path d="M 280 585 L 920 585" fill="none" stroke="#64748B" stroke-width="2.5" stroke-dasharray="6 3" />
  <text x="285" y="604" fill="#94A3B8" font-size="11" font-weight="bold">COMMON GROUND (GND)</text>
  <g transform="translate(60, 170)">
    <rect x="0" y="0" width="260" height="370" fill="#111827" stroke="#38BDF8" stroke-width="2" rx="10" />
    <text x="130" y="38" fill="#38BDF8" font-size="14" font-weight="bold" text-anchor="middle">ESP32-C3 MCU</text>
    <text x="238" y="78" fill="#FCA5A5" font-size="11" text-anchor="end">3V3</text>
    <text x="238" y="128" fill="#FDE68A" font-size="11" text-anchor="end">GPIO 4 (SCLK)</text>
    <text x="238" y="168" fill="#A7F3D0" font-size="11" text-anchor="end">GPIO 6 (MOSI)</text>
    <text x="238" y="208" fill="#BAE6FD" font-size="11" text-anchor="end">GPIO 1 (DC)</text>
    <text x="238" y="248" fill="#E9D5FF" font-size="11" text-anchor="end">GPIO 7 (CS)</text>
    <text x="238" y="288" fill="#FBCFE8" font-size="11" text-anchor="end">GPIO 0 (RST)</text>
    <text x="238" y="328" fill="#CFFAFE" font-size="11" text-anchor="end">GPIO 3 (DATA)</text>
    <text x="238" y="356" fill="#CBD5E1" font-size="11" text-anchor="end">GND</text>
  </g>
  <g transform="translate(690, 155)">
    <rect x="0" y="0" width="340" height="270" fill="#111827" stroke="#38BDF8" stroke-width="2" rx="10" />
    <text x="215" y="28" fill="#F8FAFC" font-size="14" font-weight="bold" text-anchor="middle">GC9A01 ROUND IPS TFT (240x240)</text>
    <text x="20" y="58" fill="#FCA5A5" font-size="11">VCC (3.3V)</text>
    <text x="20" y="86" fill="#CBD5E1" font-size="11">GND</text>
    <text x="20" y="118" fill="#FDE68A" font-size="11">SCL / SCK</text>
    <text x="20" y="158" fill="#A7F3D0" font-size="11">SDA / MOSI</text>
    <text x="20" y="198" fill="#BAE6FD" font-size="11">DC</text>
    <text x="20" y="238" fill="#E9D5FF" font-size="11">CS</text>
    <text x="20" y="262" fill="#FBCFE8" font-size="11">RST / RES</text>
  </g>
  <g transform="translate(690, 450)">
    <rect x="0" y="0" width="340" height="115" fill="#111827" stroke="#22D3EE" stroke-width="2" rx="10" />
    <text x="195" y="28" fill="#22D3EE" font-size="14" font-weight="bold" text-anchor="middle">DHT11 SENSOR MODULE</text>
    <text x="20" y="32" fill="#FCA5A5" font-size="11">VCC (3.3V)</text>
    <text x="20" y="62" fill="#CFFAFE" font-size="11">DATA (OUT)</text>
    <text x="20" y="92" fill="#CBD5E1" font-size="11">GND</text>
  </g>
  <path d="M 326 294 L 480 294 L 480 269 L 684 269" fill="none" stroke="#F59E0B" stroke-width="2.5" />
  <path d="M 326 334 L 500 334 L 500 309 L 684 309" fill="none" stroke="#10B981" stroke-width="2.5" />
  <path d="M 326 374 L 520 374 L 520 349 L 684 349" fill="none" stroke="#38BDF8" stroke-width="2.5" />
  <path d="M 326 414 L 540 414 L 540 389 L 684 389" fill="none" stroke="#A855F7" stroke-width="2.5" />
  <path d="M 326 454 L 560 454 L 560 413 L 684 413" fill="none" stroke="#EC4899" stroke-width="2.5" />
  <path d="M 326 494 L 460 494 L 460 508 L 684 508" fill="none" stroke="#22D3EE" stroke-width="2.5" />
</svg>`;

export default function App() {
  const [repoFiles, setRepoFiles] = useState<RepoFileEntry[]>(DEFAULT_REPO_FILES);
  const [isPushModalOpen, setIsPushModalOpen] = useState<boolean>(false);

  const handleDownloadFile = (filename: string, content: string) => {
    const mimeType = filename.endsWith('.svg')
      ? 'image/svg+xml;charset=utf-8'
      : 'text/plain;charset=utf-8';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleUpdateLogoHeader = (newHeaderContent: string) => {
    setRepoFiles((prev) =>
      prev.map((file) =>
        file.path.endsWith('iot_maker_logo_240.h')
          ? { ...file, content: newHeaderContent }
          : file
      )
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-4">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            className="text-lg font-bold tracking-tight text-slate-100 font-display whitespace-nowrap shrink-0"
          >
            ESP32-C3 Companion Studio
          </a>

          {/* Zone 2: 4 clean single-line navigation links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400"
          >
            <a
              href="#schematic"
              className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              Schematic &amp; Wiring
            </a>
            <a
              href="#emulator"
              className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              GC9A01 Emulator
            </a>
            <a
              href="#repository"
              className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              Repository Files
            </a>
            <a
              href="#readme-docs"
              className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              README Docs
            </a>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsPushModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 rounded-lg hover:bg-cyan-300 transition-colors whitespace-nowrap shrink-0"
            >
              Push to GitHub
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main id="top" className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 space-y-20">
        {/* Hero Overview Section */}
        <section className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                {/* Unboxed Metadata Line (Zero-Pill Discipline) */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400">
                  <span className="text-cyan-400">ESP32-C3 RISC-V</span>
                  <span aria-hidden="true">·</span>
                  <span>GC9A01 240×240 Round SPI TFT</span>
                  <span aria-hidden="true">·</span>
                  <span>DHT11 Sensor</span>
                  <span aria-hidden="true">·</span>
                  <span>LovyanGFX v1</span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-100 leading-tight max-w-2xl">
                  Smart Robotic Companion &amp; Environmental Telemetry Repository
                </h1>

                <p className="text-base text-slate-300 leading-relaxed max-w-2xl">
                  Complete Git repository package featuring your Arduino C++ firmware, hardware wiring schematic, 240×240 RGB565 <code className="font-mono text-sm text-cyan-300">iot_maker_logo_240.h</code> splash header, interactive GC9A01 display simulator, and one-click GitHub publisher.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPushModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <FolderGit2 className="w-4 h-4" />
                  Create &amp; Push GitHub Repo
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleDownloadFile('schematic.svg', SCHEMATIC_SVG_FILE_CONTENT)
                  }
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-200 bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  Download Wiring Diagram (.svg)
                </button>

                <a
                  href="#emulator"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
                >
                  Test 18 Emotions Live
                  <ArrowDownRight className="w-4 h-4 text-cyan-400" />
                </a>
              </div>
            </div>

            {/* Right Summary Card: Quick Pinout Reference */}
            <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono text-cyan-400">
                  QUICK HARDWARE PINOUT
                </div>
                <h2 className="text-lg font-bold text-slate-100 mt-1">
                  ESP32-C3 Bus Assignments
                </h2>
                <dl className="mt-4 divide-y divide-slate-800/80 text-xs font-mono tabular-nums">
                  <div className="py-2 flex justify-between">
                    <dt className="text-slate-400">GC9A01 SCL (SCLK)</dt>
                    <dd className="text-amber-300 font-semibold">GPIO 4 (20 MHz)</dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-slate-400">GC9A01 SDA (MOSI)</dt>
                    <dd className="text-emerald-300 font-semibold">GPIO 6</dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-slate-400">GC9A01 DC</dt>
                    <dd className="text-sky-300 font-semibold">GPIO 1</dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-slate-400">GC9A01 CS</dt>
                    <dd className="text-purple-300 font-semibold">GPIO 7</dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-slate-400">GC9A01 RST</dt>
                    <dd className="text-pink-300 font-semibold">GPIO 0</dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-slate-400">DHT11 DATA (1-Wire)</dt>
                    <dd className="text-cyan-300 font-semibold">GPIO 3</dd>
                  </div>
                </dl>
              </div>
              <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
                Supply: Regulated 3.3V · Radio TX: 8.5 dBm
              </div>
            </div>
          </div>

          {/* Full-width 4-Column Hardware KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4">
              <div className="text-xs text-slate-400">Display Geometry</div>
              <div className="text-xl font-bold font-mono tabular-nums text-slate-100 mt-1">
                240 × 240 px
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Circular IPS RGB565 · Direct SPI2
              </div>
            </div>
            <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4">
              <div className="text-xs text-slate-400">SPI Write Clock</div>
              <div className="text-xl font-bold font-mono tabular-nums text-slate-100 mt-1">
                20.0 MHz
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Tuned for 2.4 GHz Wi-Fi coexistence
              </div>
            </div>
            <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4">
              <div className="text-xs text-slate-400">Robotic Expressions</div>
              <div className="text-xl font-bold font-mono tabular-nums text-slate-100 mt-1">
                18 Emotions
              </div>
              <div className="text-xs text-slate-400 mt-1">
                3000ms cycle · 150ms blink engine
              </div>
            </div>
            <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4">
              <div className="text-xs text-slate-400">Mode Scheduler</div>
              <div className="text-xl font-bold font-mono tabular-nums text-slate-100 mt-1">
                4000 ms Flip
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Alternates Face &amp; Smart Dashboard
              </div>
            </div>
          </div>
        </section>

        {/* Section 1: Interactive Schematic & Pinout Diagram */}
        <SchematicDiagram
          onDownloadSvg={() =>
            handleDownloadFile('schematic.svg', SCHEMATIC_SVG_FILE_CONTENT)
          }
        />

        {/* Section 2: Interactive 240x240 GC9A01 Emulator */}
        <Gc9a01Emulator onUpdateLogoHeader={handleUpdateLogoHeader} />

        {/* Section 3 & 4: Repository Explorer, README Docs & GitHub Push Modal */}
        <RepoExplorerAndPush
          files={repoFiles}
          schematicSvgContent={SCHEMATIC_SVG_FILE_CONTENT}
          onDownloadFile={handleDownloadFile}
          isPushModalOpen={isPushModalOpen}
          setIsPushModalOpen={setIsPushModalOpen}
        />
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-800/80 py-8 px-6 mt-16">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            THE IoT MAKER · ESP32-C3 + GC9A01 + DHT11 Smart Companion &amp; Dashboard Repository
          </div>
          <div className="flex items-center gap-6">
            <a href="#schematic" className="hover:text-slate-300 transition-colors">
              Schematic
            </a>
            <a href="#emulator" className="hover:text-slate-300 transition-colors">
              Display Emulator
            </a>
            <a href="#repository" className="hover:text-slate-300 transition-colors">
              Source Files
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
