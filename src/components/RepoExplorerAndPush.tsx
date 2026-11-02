import React, { useState } from 'react';
import { RepoFileEntry } from '../utils/repoFiles';
import { validateGitHubPushInput, PIN_CONNECTIONS, EMOTION_NAMES, getEmotionRenderParams, formatRgb565Hex } from '../utils/hardwareSpec';
import {
  Check,
  Copy,
  Download,
  FileCode,
  FileText,
  FolderGit2,
  GitBranch,
  ExternalLink,
  AlertCircle,
  Terminal
} from 'lucide-react';

interface RepoExplorerAndPushProps {
  files: RepoFileEntry[];
  schematicSvgContent: string;
  onDownloadFile: (filename: string, content: string) => void;
  isPushModalOpen: boolean;
  setIsPushModalOpen: (open: boolean) => void;
}

interface PushResultState {
  status: 'idle' | 'submitting' | 'success' | 'error';
  repoUrl?: string;
  commitSha?: string;
  message?: string;
}

export const RepoExplorerAndPush: React.FC<RepoExplorerAndPushProps> = ({
  files,
  schematicSvgContent,
  onDownloadFile,
  isPushModalOpen,
  setIsPushModalOpen
}) => {
  const allEntries: RepoFileEntry[] = [
    ...files,
    {
      path: 'docs/schematic.svg',
      label: 'docs/schematic.svg',
      language: 'svg',
      description: 'Vector hardware wiring schematic and pin connection diagram.',
      content: schematicSvgContent
    }
  ];

  const [selectedPath, setSelectedPath] = useState<string>(allEntries[0].path);
  const [copiedFile, setCopiedFile] = useState<boolean>(false);
  const [copiedCli, setCopiedCli] = useState<boolean>(false);

  // GitHub Push Form State
  const [repoName, setRepoName] = useState<string>('esp32c3-gc9a01-smart-companion');
  const [repoDescription, setRepoDescription] = useState<string>(
    'ESP32-C3 + GC9A01 240x240 Round SPI TFT + DHT11 Smart Companion & IoT Dashboard with LovyanGFX'
  );
  const [githubToken, setGithubToken] = useState<string>('');
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [commitMessage, setCommitMessage] = useState<string>(
    'Initial commit: ESP32-C3 GC9A01 firmware, RGB565 splash header, schematic, and README'
  );
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [pushResult, setPushResult] = useState<PushResultState>({ status: 'idle' });

  const activeFile = allEntries.find((f) => f.path === selectedPath) ?? allEntries[0];

  const handleCopyActiveFile = () => {
    navigator.clipboard.writeText(activeFile.content);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 1800);
  };

  const handleDownloadAllFiles = () => {
    // Download a self-contained shell / bundle script or trigger individual file downloads
    const bundleScript = [
      '#!/usr/bin/env bash',
      '# Self-extracting repository generator for esp32c3-gc9a01-smart-companion',
      'set -e',
      'mkdir -p esp32c3-gc9a01-smart-companion/firmware/esp32c3_gc9a01_companion esp32c3-gc9a01-smart-companion/docs',
      'cd esp32c3-gc9a01-smart-companion',
      ...allEntries.map(
        (entry) =>
          `cat << 'EOF_FILE_BOUNDARY' > "${entry.path}"\n${entry.content}\nEOF_FILE_BOUNDARY`
      ),
      'git init -b main',
      'git add .',
      'git commit -m "Initial commit: ESP32-C3 + GC9A01 + DHT11 Smart Companion & Dashboard"',
      'echo "Repository created in ./esp32c3-gc9a01-smart-companion"'
    ].join('\n\n');

    onDownloadFile('create-esp32c3-repo.sh', bundleScript);
  };

  const handleGitHubPushSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateGitHubPushInput({
      token: githubToken,
      repoName
    });

    if (!validation.valid) {
      setFormErrors(validation.errors);
      setPushResult({ status: 'idle' });
      return;
    }

    setFormErrors({});
    setPushResult({ status: 'submitting' });

    try {
      const response = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: githubToken.trim(),
          repoName: repoName.trim(),
          description: repoDescription.trim(),
          isPrivate,
          commitMessage: commitMessage.trim() || 'Initial commit',
          files: allEntries.map((f) => ({ path: f.path, content: f.content }))
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setPushResult({
          status: 'error',
          message: data.error || 'Failed to push repository to GitHub.'
        });
        return;
      }

      setPushResult({
        status: 'success',
        repoUrl: data.repoUrl,
        commitSha: data.commitSha,
        message: `Successfully created and pushed ${allEntries.length} files to ${data.fullName}!`
      });
    } catch (err) {
      setPushResult({
        status: 'error',
        message: err instanceof Error ? err.message : 'Network error while contacting server.'
      });
    }
  };

  const gitCliCommands = `# Local Git repository is already initialized with all 5 files committed:
git status
git remote add origin https://github.com/<YOUR_USERNAME>/${repoName || 'esp32c3-gc9a01-smart-companion'}.git
git branch -M main
git push -u origin main`;

  const handleCopyCli = () => {
    navigator.clipboard.writeText(gitCliCommands);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 1800);
  };

  return (
    <>
      {/* SECTION 3: REPOSITORY FILE EXPLORER */}
      <section id="repository" className="scroll-mt-24 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-slate-800 pb-6">
          <div>
            <p className="text-xs font-mono text-cyan-400 tracking-wide">
              03. Git Repository Tree &amp; Source Code
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mt-1">
              Repository Files &amp; GitHub Export
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl">
              Inspect the initialized Git repository files (<code className="font-mono text-slate-200">README.md</code>, <code className="font-mono text-slate-200">esp32c3_gc9a01_companion.ino</code>, <code className="font-mono text-slate-200">iot_maker_logo_240.h</code>, <code className="font-mono text-slate-200">platformio.ini</code>, and <code className="font-mono text-slate-200">docs/schematic.svg</code>).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadAllFiles}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-200 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              Download Repo Bundle (.sh)
            </button>

            <button
              type="button"
              onClick={() => setIsPushModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              Push Repository to GitHub
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* File Tree Sidebar */}
          <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400 bg-slate-950/50">
              <span>BRANCH: main</span>
              <span>{allEntries.length} FILES</span>
            </div>

            <div className="divide-y divide-slate-800/70" role="tablist" aria-label="Repository files">
              {allEntries.map((entry) => {
                const active = entry.path === selectedPath;
                return (
                  <button
                    key={entry.path}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelectedPath(entry.path)}
                    className={`w-full text-left p-4 transition-colors flex items-start gap-3 ${
                      active
                        ? 'bg-cyan-500/10 text-white'
                        : 'hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    {entry.language === 'markdown' ? (
                      <FileText className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    ) : (
                      <FileCode className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-mono font-semibold text-slate-100 truncate">
                        {entry.path}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {entry.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Git CLI Quick Box */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  Git Remote Push Commands
                </span>
                <button
                  type="button"
                  onClick={handleCopyCli}
                  className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0"
                >
                  {copiedCli ? 'Copied!' : 'Copy CLI'}
                </button>
              </div>
              <pre className="p-2.5 bg-slate-950 border border-slate-800 rounded text-[10px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
                {gitCliCommands}
              </pre>
            </div>
          </div>

          {/* Code Viewer Panel */}
          <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/50">
              <div className="font-mono text-xs text-slate-200 font-semibold truncate">
                {activeFile.path}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyActiveFile}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  {copiedFile ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copied File
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      Copy Content
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onDownloadFile(activeFile.label, activeFile.content)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  Download {activeFile.label}
                </button>
              </div>
            </div>

            <pre className="p-4 sm:p-6 text-xs font-mono text-slate-200 overflow-x-auto max-h-[540px] leading-relaxed bg-slate-950/80">
              <code>{activeFile.content}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* SECTION 4: RENDERED README.MD DOCUMENTATION VIEW */}
      <section id="readme-docs" className="scroll-mt-24 space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <p className="text-xs font-mono text-cyan-400 tracking-wide">
            04. Repository README.md Specification
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mt-1">
            Formatted Hardware &amp; Firmware Documentation
          </h2>
          <p className="text-sm text-slate-400 mt-2 max-w-2xl">
            Complete hardware setup, LovyanGFX driver configuration, and 18-state expression reference included in your repository's root <code className="font-mono text-slate-200">README.md</code>.
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-8 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                1. Arduino IDE &amp; PlatformIO Ready
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Requires <code className="font-mono text-slate-200">lovyan03/LovyanGFX</code> and <code className="font-mono text-slate-200">adafruit/DHT sensor library</code>. Configured for ESP32-C3 SuperMini and DevKitM-1 at 115200 baud.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                2. Non-Blocking Scheduler Architecture
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Uses <code className="font-mono text-slate-200">millis()</code> delta timers for 4000ms screen flips, 2500ms DHT11 reads, 500ms partial dashboard redraws, and 15000ms Wi-Fi reconnect backoff.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                3. 18 Procedural Facial States
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Cycles through 18 expressions every 3000ms with randomized saccades (<code className="font-mono text-slate-200">gazeX</code>, <code className="font-mono text-slate-200">gazeY</code>) and 150ms blinks drawn directly to SPI2.
              </p>
            </div>
          </div>

          {/* 18-State Expression Table */}
          <div>
            <h3 className="text-base font-semibold text-slate-100 mb-4">
              Robotic Expression Engine Reference Table (18 Emotions)
            </h3>
            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 font-mono text-[11px] text-slate-400">
                    <th className="py-2.5 px-4">Index</th>
                    <th className="py-2.5 px-4">Enum Identifier</th>
                    <th className="py-2.5 px-4">Eye Size (w×h)</th>
                    <th className="py-2.5 px-4">RGB565 Constant</th>
                    <th className="py-2.5 px-4">Visual Characteristics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {EMOTION_NAMES.map((name, idx) => {
                    const spec = getEmotionRenderParams(name, 0, 0);
                    return (
                      <tr key={name} className="hover:bg-slate-800/40">
                        <td className="py-2 px-4 font-mono tabular-nums text-slate-400">
                          {idx}
                        </td>
                        <td className="py-2 px-4 font-mono font-semibold text-cyan-400">
                          {name}
                        </td>
                        <td className="py-2 px-4 font-mono tabular-nums text-slate-200">
                          {spec.w} × {spec.h} px
                        </td>
                        <td className="py-2 px-4 font-mono tabular-nums text-slate-300">
                          <span
                            className="inline-block w-2 h-2 rounded-xs mr-2"
                            style={{ backgroundColor: spec.colorHex }}
                          />
                          {formatRgb565Hex(spec.rgb565)}
                        </td>
                        <td className="py-2 px-4 text-slate-300">{spec.description}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* GITHUB PUSH MODAL DIALOG */}
      {isPushModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="github-push-modal-title"
        >
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <GitBranch className="w-5 h-5 text-cyan-400" />
                <h3 id="github-push-modal-title" className="text-lg font-bold text-slate-100">
                  Create &amp; Push Repository to GitHub
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPushModalOpen(false)}
                className="px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 rounded-md"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleGitHubPushSubmit} className="p-6 space-y-4" noValidate>
              <p className="text-xs text-slate-400 leading-relaxed">
                Creates a new GitHub repository under your account and commits all 5 files (<code className="font-mono text-slate-200">README.md</code>, <code className="font-mono text-slate-200">docs/schematic.svg</code>, <code className="font-mono text-slate-200">platformio.ini</code>, <code className="font-mono text-slate-200">esp32c3_gc9a01_companion.ino</code>, and <code className="font-mono text-slate-200">iot_maker_logo_240.h</code>).
              </p>

              <div>
                <label
                  htmlFor="github-repo-name"
                  className="block text-xs font-medium text-slate-200 mb-1"
                >
                  Repository Name <span className="text-rose-400">*</span>
                </label>
                <input
                  id="github-repo-name"
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="esp32c3-gc9a01-smart-companion"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                />
                {formErrors.repoName && (
                  <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {formErrors.repoName}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="github-pat-input"
                  className="block text-xs font-medium text-slate-200 mb-1"
                >
                  GitHub Personal Access Token (with <code className="font-mono text-cyan-400">repo</code> scope) <span className="text-rose-400">*</span>
                </label>
                <input
                  id="github-pat-input"
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                />
                {formErrors.token && (
                  <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {formErrors.token}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="github-repo-desc"
                  className="block text-xs font-medium text-slate-200 mb-1"
                >
                  Repository Description
                </label>
                <input
                  id="github-repo-desc"
                  type="text"
                  value={repoDescription}
                  onChange={(e) => setRepoDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label
                    htmlFor="github-commit-msg"
                    className="block text-xs font-medium text-slate-200 mb-1"
                  >
                    Commit Message
                  </label>
                  <input
                    id="github-commit-msg"
                    type="text"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="pt-4">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-cyan-500"
                    />
                    Create as Private Repository
                  </label>
                </div>
              </div>

              {pushResult.status === 'error' && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{pushResult.message}</span>
                </div>
              )}

              {pushResult.status === 'success' && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-200 space-y-2">
                  <div className="font-semibold">{pushResult.message}</div>
                  {pushResult.repoUrl && (
                    <a
                      href={pushResult.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-cyan-300 underline font-mono"
                    >
                      {pushResult.repoUrl}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPushModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pushResult.status === 'submitting'}
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {pushResult.status === 'submitting'
                    ? 'Pushing to GitHub...'
                    : 'Create Repo & Push Commits'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
