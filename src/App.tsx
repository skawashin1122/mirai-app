/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Play,
  Pause,
  RotateCcw,
  Music,
  Zap,
  Globe,
  Cpu,
  Heart,
  Share2,
  Volume2,
  VolumeX,
  Compass,
  Sparkles,
  Award,
  ChevronRight,
  Flame,
  X,
  Copy,
  Check,
  HelpCircle,
  ExternalLink
} from "lucide-react";

import { AppScreen, SongMetadata, ResonanceLog, LyricPhrase } from "./types";
import { songs } from "./songs";
import { audioEngine } from "./audioEngine";
import { textAliveService } from "./textaliveService";

import { WaveformOverlay } from "./components/WaveformOverlay";
import { ParticleLayer, ParticleLayerRef } from "./components/ParticleLayer";
import { ResultChart } from "./components/ResultChart";

export default function App() {
  const [screen, setScreen] = useState<AppScreen>(AppScreen.TOP_BOOT);
  const [isActivated, setIsActivated] = useState<boolean>(false);
  const [selectedSong, setSelectedSong] = useState<SongMetadata>(songs[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [resonanceLogs, setResonanceLogs] = useState<ResonanceLog[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [hoveredSongId, setHoveredSongId] = useState<string | null>(null);

  // Playback mode: synth (local procedural) vs textalive (online)
  const [playMode, setPlayMode] = useState<"synth" | "textalive">("synth");
  const [textAliveStatus, setTextAliveStatus] = useState<string>("init");
  const [textAliveErrorHelp, setTextAliveErrorHelp] = useState<boolean>(false);

  // Sharing states
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // References
  const particleLayerRef = useRef<ParticleLayerRef | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);

  // Heartbeat sound on initial tap
  const handleBootActivate = (x: number, y: number) => {
    setIsActivated(true);
    audioEngine.playHeartbeat();
    
    // Spawn initial particle burst at the tap coordinates
    setTimeout(() => {
      particleLayerRef.current?.spawnParticles(x, y, "Miku", "cyan");
    }, 100);

    // Transition to choice screen after explosion settles
    setTimeout(() => {
      setScreen(AppScreen.TOP_SELECT);
    }, 1200);
  };

  // Metronome track selection helpers
  const handleSelectSong = (song: SongMetadata) => {
    setSelectedSong(song);
    audioEngine.setSong(song.id, song.bpm, song.duration);
    setCurrentTime(0);
    setResonanceLogs([]);
    setScreen(AppScreen.PLAYING);
    
    // Auto starts song playback
    setTimeout(() => {
      handlePlayStart();
    }, 300);
  };

  // Music playback controllers
  const handlePlayStart = () => {
    if (playMode === "synth") {
      audioEngine.play(
        (ms) => setCurrentTime(ms),
        () => handleEnded()
      );
      setIsPlaying(true);
    } else {
      textAliveService.play();
    }
  };

  const handlePause = () => {
    if (playMode === "synth") {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      textAliveService.pause();
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    audioEngine.stop();
    textAliveService.stop();
    
    // Soft delay, white-out out to results
    setTimeout(() => {
      setScreen(AppScreen.RESULT);
    }, 800);
  };

  const handleResetPlayback = () => {
    if (playMode === "synth") {
      audioEngine.stop();
      setCurrentTime(0);
      setIsPlaying(false);
      audioEngine.play(
        (ms) => setCurrentTime(ms),
        () => handleEnded()
      );
      setIsPlaying(true);
    } else {
      textAliveService.stop();
      setTimeout(() => textAliveService.play(), 100);
    }
  };

  // Toggle audio engine mute
  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    // Standard audio ctx node gain handles can go here, but for simplicity we keep volume low/high
  };

  // Initialize TextAlive player if needed
  useEffect(() => {
    if (screen === AppScreen.PLAYING && playMode === "textalive") {
      setTextAliveStatus("loading");
      setTextAliveErrorHelp(false);

      // Timeout helper if TextAlive fails to load due to iframe sandbox blockings
      const loadTimeout = setTimeout(() => {
        if (textAliveStatus === "loading") {
          setTextAliveStatus("error: sandbox_failed");
        }
      }, 7000);

      textAliveService.initialize(
        "textalive-video-holder",
        (ms) => {
          setCurrentTime(ms);
        },
        (word) => {
          // high-density callback
        },
        (status) => {
          setTextAliveStatus(status);
          if (status === "playing") setIsPlaying(true);
          if (status === "paused") setIsPlaying(false);
          if (status === "loaded") {
            // Song completed loading, auto trigger audio elements
            textAliveService.play();
          }
          if (status.includes("error")) {
            console.warn("TextAlive status reported issue:", status);
          }
        },
        () => {
          handleEnded();
        }
      );

      textAliveService.loadSong(selectedSong.id);

      return () => {
        clearTimeout(loadTimeout);
        textAliveService.dispose();
      };
    }
  }, [screen, playMode, selectedSong]);

  // Sync state if playMode changes
  const switchPlayMode = (mode: "synth" | "textalive") => {
    // Stop current
    audioEngine.stop();
    textAliveService.stop();
    setIsPlaying(false);
    setCurrentTime(0);

    setPlayMode(mode);

    // Prompt user choice starting playback
    setTimeout(() => {
      if (mode === "synth") {
        audioEngine.setSong(selectedSong.id, selectedSong.bpm, selectedSong.duration);
        handlePlayStart();
      }
    }, 200);
  };

  // Active phrase index lookup
  const activePhraseInfo = useMemo(() => {
    const activeIdx = selectedSong.lyrics.findIndex(
      (p) => currentTime >= p.startTime && currentTime <= p.endTime
    );

    let activePhrase: LyricPhrase | null = null;
    let pastPhrases: LyricPhrase[] = [];
    let futurePhrases: LyricPhrase[] = [];

    if (activeIdx !== -1) {
      activePhrase = selectedSong.lyrics[activeIdx];
      pastPhrases = selectedSong.lyrics.slice(Math.max(0, activeIdx - 2), activeIdx);
      futurePhrases = selectedSong.lyrics.slice(activeIdx + 1, activeIdx + 3);
    } else {
      // Look for next phrase if currently in instrumental gap/break
      const nextIdx = selectedSong.lyrics.findIndex((p) => p.startTime > currentTime);
      if (nextIdx !== -1) {
        activePhrase = null; // show rest state
        pastPhrases = selectedSong.lyrics.slice(Math.max(0, nextIdx - 2), nextIdx);
        futurePhrases = selectedSong.lyrics.slice(nextIdx, nextIdx + 2);
      } else {
        // Post song
        pastPhrases = selectedSong.lyrics.slice(selectedSong.lyrics.length - 2);
        activePhrase = null;
        futurePhrases = [];
      }
    }

    return { activePhrase, pastPhrases, futurePhrases };
  }, [selectedSong, currentTime]);

  // Handle clicking on individual word character
  const handleCharTap = (e: React.MouseEvent, char: string, phraseText: string) => {
    // Generate chiptune frequency and sound feedback
    audioEngine.playHitSound(char);

    // Trace coordinate and dispatch floating heart particles
    particleLayerRef.current?.spawnParticles(
      e.clientX,
      e.clientY,
      char,
      selectedSong.id === "melt" ? "cyan" : selectedSong.id === "greenlights" ? "pink" : "red"
    );

    // Save logs
    const newLog: ResonanceLog = {
      timestamp: currentTime,
      lyricChar: char,
      phraseText,
    };
    setResonanceLogs((prev) => [...prev, newLog]);
  };

  // Share results to clipboard or Twitter
  const getShareText = () => {
    // Calculate top phrase from user statistics
    const totalTaps = resonanceLogs.length;
    const phraseCounts: Record<string, number> = {};
    resonanceLogs.forEach((l) => {
      phraseCounts[l.phraseText] = (phraseCounts[l.phraseText] || 0) + 1;
    });

    let topPhrase = "心に沁み入るメロディ";
    let maxCount = 0;
    Object.entries(phraseCounts).forEach(([txt, cnt]) => {
      if (cnt > maxCount) {
        maxCount = cnt;
        topPhrase = txt;
      }
    });

    return `私の心は『${selectedSong.title}』に共鳴した！\n刺さった瞬間：${totalTaps}回\n最も心に刺さった歌詞：『${topPhrase}』\n音楽にあわせて歌詞をタップして感情を波形にする『共鳴マップ』で、みんなも遊んでみてね！\n#共鳴マップ #マジカルミライ2026 #初音ミク\n${window.location.href}`;
  };

  const handleTwitterShare = () => {
    const text = getShareText();
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleCopyToClipboard = () => {
    const text = getShareText();
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Auto scroll active lyric view on transition
  useEffect(() => {
    if (lyricsContainerRef.current) {
      const activeEl = lyricsContainerRef.current.querySelector(".active-lyric-box");
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activePhraseInfo.activePhrase]);

  return (
    <div
      id="app-root-container"
      ref={containerRef}
      className="relative min-h-screen bg-zinc-950 text-slate-100 flex flex-col justify-between overflow-hidden p-4 md:p-6"
    >
      {/* Absolute particle graphics overlaid layer */}
      <ParticleLayer ref={particleLayerRef} />

      {/* BACKGROUND ABSTRACT ANIMATED AMBIENT ELEMENTS */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* HEADER BAR */}
      <header className="relative z-10 flex justify-between items-center py-2 px-4 bg-zinc-900/60 backdrop-blur-md rounded-xl border border-zinc-800/80 mb-4 shadow-lg select-none">
        <div className="flex items-center space-x-2.5">
          <div className="p-1 px-2.5 bg-gradient-to-r from-teal-400 to-pink-500 rounded-lg shadow-md flex items-center justify-center">
            <Compass className="w-5 h-5 text-zinc-950 animate-spin-slow font-bold" />
          </div>
          <div>
            <h1 className="text-sm font-display font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-emerald-300 to-pink-400">
              共鳴マップ
            </h1>
            <p className="text-[9px] font-mono tracking-tighter text-zinc-400">
              RESONANCE MAP // VER.PROTOTYPE
            </p>
          </div>
        </div>

        {/* Global info nodes */}
        <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
          <span className="hidden sm:inline bg-zinc-950 px-2 py-0.5 rounded text-teal-400 border border-zinc-800">
            マジカルミライ 2026 // コンテスト作品
          </span>
          {screen === AppScreen.PLAYING && (
            <div className="flex items-center space-x-1.5 bg-zinc-950/80 px-2.5 py-1 rounded-md border border-zinc-800">
              <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500 animate-pulse" />
              <span>共鳴タップ: <strong className="text-white font-bold text-sm tracking-widest">{resonanceLogs.length}</strong></span>
            </div>
          )}
        </div>
      </header>

      {/* MAIN VIEWPORT BODY */}
      <main className="relative z-10 flex-1 flex flex-col justify-center max-w-4xl w-full mx-auto my-2">
        <AnimatePresence mode="wait">
          
          {/*================ SCREEN 1: TOP BOOT SCREEN ================*/}
          {screen === AppScreen.TOP_BOOT && (
            <motion.div
              key="top_boot"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center space-y-10 text-center py-12"
            >
              <div className="space-y-4 max-w-xl">
                {/* Intro pulsing text tag */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center space-x-1.5 bg-teal-950/50 border border-teal-500/30 px-3 py-1 rounded-full text-xs text-teal-400 font-mono tracking-wider"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>VOCALOID LIRICAL SYNCHRONIZER</span>
                </motion.div>

                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-relaxed">
                  あなたの心に刺さるフレーズは、<br />どこですか？
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-md mx-auto">
                  楽曲再生中に「心が動いた歌詞」を直感的にタップ。リスナーみんなの感情の動きをビジュアル化し、美しい感情波形を描き出します。
                </p>
              </div>

              {/* Responsive interactive horizontal flowing thread */}
              <div className="w-full py-4 relative">
                <WaveformOverlay
                  isActivated={isActivated}
                  onActivated={handleBootActivate}
                />
                
                {/* Floating click prompt lines */}
                {!isActivated && (
                  <motion.div
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, 4, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="absolute inset-x-0 bottom-4 text-center pointer-events-none"
                  >
                    <span className="text-[11px] font-mono tracking-widest text-[#39C5BB] font-semibold bg-zinc-950/90 py-1.5 px-4 rounded-full border border-teal-500/20 shadow-md">
                      【 画面をタップして、共鳴を起動する 】
                    </span>
                  </motion.div>
                )}
              </div>

              {/* Footer specs details */}
              <div className="grid grid-cols-3 gap-4 max-w-sm w-full mx-auto text-center border-t border-zinc-900 pt-6">
                <div>
                  <span className="block text-[10px] text-zinc-500 font-mono">SYNTAX</span>
                  <span className="text-xs font-mono text-zinc-300 font-bold">TextAlive App API</span>
                </div>
                <div>
                  <span className="block text-[10px] text-zinc-500 font-mono">RENDERING</span>
                  <span className="text-xs font-mono text-zinc-300 font-bold">Procedural Core</span>
                </div>
                <div>
                  <span className="block text-[10px] text-zinc-500 font-mono">LATENCY</span>
                  <span className="text-xs font-mono text-zinc-300 font-bold">~0.1ms Sync</span>
                </div>
              </div>
            </motion.div>
          )}

          {/*================ SCREEN 1: TOP SONG SELECT DECK ================*/}
          {screen === AppScreen.TOP_SELECT && (
            <motion.div
              key="top_select"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col space-y-6 py-4"
            >
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold font-display tracking-widest text-white">共鳴する体験楽曲を選択してください</h2>
                <p className="text-xs text-zinc-400">各曲のテンポ（BPM）に合わせて、カードが鼓動（ブレス）します</p>
              </div>

              {/* Horizontal / Vertical Deck Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                {songs.map((song) => {
                  const isHovered = hoveredSongId === song.id;
                  
                  return (
                    <motion.div
                      key={song.id}
                      onMouseEnter={() => setHoveredSongId(song.id)}
                      onMouseLeave={() => setHoveredSongId(null)}
                      whileHover={{ y: -6, scale: 1.02 }}
                      style={{
                        "--bpm-duration": `${60 / song.bpm}s`,
                      } as React.CSSProperties}
                      className={`relative overflow-hidden rounded-2xl bg-zinc-900 border transition-all duration-300 p-5 flex flex-col justify-between h-[360px] cursor-pointer shadow-lg hover:shadow-2xl ${
                        isHovered 
                          ? "border-teal-400 shadow-teal-500/10 animate-pulse-bpm" 
                          : "border-zinc-800"
                      }`}
                      onClick={() => handleSelectSong(song)}
                    >
                      {/* Song stylized glowing art vector */}
                      <div className={`absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br ${song.accentColor} rounded-full blur-2xl opacity-40`} />

                      {/* Jacket art & title details */}
                      <div className="space-y-4 relative z-10">
                        {/* Custom visual jacket cover disk */}
                        <div className="w-14 h-14 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow-inner relative overflow-hidden group">
                          {/* Pulsing vinyl record effect */}
                          <div className={`absolute inset-1 rounded-full border border-dashed border-zinc-700 ${isHovered ? "animate-spin-slow" : ""}`} />
                          <div className="absolute inset-4.5 rounded-full bg-teal-500/20" />
                          <Music className={`w-6 h-6 ${isHovered ? "text-teal-400" : "text-zinc-500"} transition-colors`} />
                        </div>

                        <div>
                          <span className="inline-block px-2 py-0.5 text-[10px] font-mono tracking-wider text-teal-400 bg-teal-950/60 rounded border border-teal-900/50 mb-1">
                            BPM {song.bpm} // DURATION {song.duration}s
                          </span>
                          <h3 className="text-lg font-bold text-white tracking-wide line-clamp-1">{song.title}</h3>
                          <p className="text-xs text-zinc-400 font-medium">{song.artist}</p>
                        </div>

                        <p className="text-xs text-zinc-400 leading-relaxed min-h-[60px]">
                          {song.description}
                        </p>
                      </div>

                      {/* Accent CTA */}
                      <div className="mt-4 relative z-10 pt-4 border-t border-zinc-800 flex justify-between items-center text-xs">
                        <span className="text-zinc-500 font-mono">SELECTION LOAD</span>
                        <span className="flex items-center space-x-1 font-bold text-teal-400 group-hover:text-pink-400 transition-colors">
                          <span>これでスタート</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Fast recovery skip button */}
              <button
                onClick={() => setScreen(AppScreen.TOP_BOOT)}
                className="self-center mt-6 text-zinc-500 hover:text-zinc-300 text-xs font-mono flex items-center space-x-1 transition-colors bg-zinc-900/40 border border-zinc-800 pf-1 px-4 py-1.5 rounded-full"
              >
                <span>← 起動画面に戻る</span>
              </button>
            </motion.div>
          )}

          {/*================ SCREEN 2: MAIN PLAYING SCREEN ================*/}
          {screen === AppScreen.PLAYING && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-4 gap-6 py-2 h-full items-stretch"
            >
              {/* LEFT DECK COLUMN: TRACK METADATA & PLAYER CONFIG */}
              <div className="md:col-span-1 bg-zinc-900/60 backdrop-blur-md rounded-2xl border border-zinc-800 p-5 flex flex-col justify-between space-y-4 shadow-xl">
                <div className="space-y-4">
                  
                  {/* Rotating visual disc cover */}
                  <div className="w-full aspect-square rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center relative overflow-hidden group shadow-2xl">
                    <div className={`absolute inset-2 bg-gradient-to-br ${selectedSong.accentColor} rounded-full blur-2xl opacity-20`} />
                    
                    {/* Retro vinyl ridges */}
                    <div className={`w-36 h-36 rounded-full border-4 border-zinc-900 shadow-inner flex items-center justify-center relative ${isPlaying ? "animate-spin-slow" : ""}`}>
                      <div className="absolute inset-0.5 rounded-full border border-dashed border-zinc-700" />
                      <div className="absolute inset-5 rounded-full border border-zinc-800" />
                      <div className="absolute inset-10 rounded-full border border-dashed border-zinc-700" />
                      <div className="w-10 h-10 rounded-full bg-zinc-950 border-2 border-teal-400 absolute flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-white" />
                      </div>
                    </div>

                    {/* Rhythmic beat pulses synchronized visually to active playback */}
                    {isPlaying && (
                      <div className="absolute bottom-3 text-[10px] font-mono tracking-widest text-teal-400 flex items-center space-x-1 bg-zinc-950/80 px-2 py-0.5 rounded-full border border-teal-500/20">
                        <Zap className="w-3 h-3 text-teal-400 animate-pulse" />
                        <span>BPM {selectedSong.bpm}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 text-center md:text-left">
                    <h3 className="text-base font-bold text-white tracking-wide line-clamp-1">{selectedSong.title}</h3>
                    <p className="text-xs text-zinc-400 font-medium line-clamp-1">{selectedSong.artist}</p>
                  </div>
                </div>

                {/* PLAYBACK MODE SWITCHER AND SYNC DETAILED CONFIG */}
                <div className="space-y-4 pt-4 border-t border-zinc-800">
                  <div className="space-y-1.5">
                    <span className="block text-[10px] font-mono tracking-wider text-zinc-500">PLAYBACK ENGINE</span>
                    
                    {/* Buttons toggles */}
                    <div className="grid grid-cols-2 gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                      <button
                        onClick={() => switchPlayMode("synth")}
                        className={`flex flex-col items-center justify-center space-y-1 py-2 text-[10px] font-mono rounded font-medium transition-all ${
                          playMode === "synth"
                            ? "bg-zinc-800 text-teal-400 border border-zinc-700"
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        <Cpu className="w-3.5 h-3.5" />
                        <span>SYNTH CORE</span>
                      </button>
                      <button
                        onClick={() => switchPlayMode("textalive")}
                        className={`flex flex-col items-center justify-center space-y-1 py-2 text-[10px] font-mono rounded font-medium transition-all ${
                          playMode === "textalive"
                            ? "bg-zinc-800 text-pink-400 border border-zinc-700"
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>TEXTALIVE</span>
                      </button>
                    </div>
                  </div>

                  {/* Mode-specific status descriptions */}
                  {playMode === "synth" ? (
                    <div className="bg-zinc-950/50 p-2.5 rounded-lg border border-zinc-900 text-[11px] text-zinc-400 leading-relaxed font-mono">
                      <span className="text-teal-400 block font-bold mb-1">⚡ 仮想シンカ・シンセ</span>
                      オフライン動作100%保証。BPMに同期したMIDI風のビートを生成します。
                    </div>
                  ) : (
                    <div className="bg-zinc-950/50 p-2.5 rounded-lg border border-zinc-900 text-[11px] text-zinc-400 leading-relaxed font-mono flex flex-col space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-pink-400 font-bold">🌐 TextAlive API同期</span>
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                          textAliveStatus === "playing" ? "bg-emerald-500 animate-pulse" :
                          textAliveStatus === "loaded" ? "bg-teal-400" : "bg-zinc-600 animate-ping"
                        }`} />
                      </div>
                      <p className="text-[10px] text-zinc-500 capitalize">状態: {textAliveStatus}</p>
                      
                      {/* Friendly warning if TextAlive remains stuck/fails to load in iframe sandbox constraints */}
                      {textAliveStatus.includes("error") || textAliveStatus === "loading" ? (
                        <div className="mt-1.5 pt-1.5 border-t border-zinc-900">
                          <button
                            onClick={() => setTextAliveErrorHelp(!textAliveErrorHelp)}
                            className="text-[9px] text-[#39C5BB] underline flex items-center space-x-0.5"
                          >
                            <HelpCircle className="w-3 h-3" />
                            <span>読み込みが終わらない場合...</span>
                          </button>
                          {textAliveErrorHelp && (
                            <p className="mt-1 text-[9px] text-zinc-500 leading-tight">
                              砂箱(Iframe)規制により、一部のブラウザでYouTube再生枠がブロックされる場合があります。その場合はお手数ですが「SYNTH CORE」モードへ切り替えてお楽しみください。
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Back to deck CTA */}
                <button
                  onClick={() => {
                    audioEngine.stop();
                    textAliveService.stop();
                    setScreen(AppScreen.TOP_SELECT);
                  }}
                  className="w-full py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all rounded-lg text-xs font-mono tracking-widest flex items-center justify-center space-x-1"
                >
                  <span>曲選択へ戻る</span>
                </button>
              </div>

              {/* RIGHT / CENTER DIORAMA COLUMN: SYNCHRONIZED TIMED LYRICS PLAYGROUND */}
              <div id="lyrics-board-column" className="md:col-span-3 bg-zinc-950/45 rounded-2xl border border-zinc-800/80 p-6 flex flex-col justify-between space-y-6 shadow-2xl relative overflow-hidden flex-1">
                
                {/* Micro-meter background coordinate lines for high-tech aesthetic */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

                {/* Top prompt detailing interactiveness */}
                <div className="relative z-10 flex justify-between items-center bg-zinc-900/40 p-2 px-3.5 rounded-lg border border-zinc-800/50">
                  <div className="flex items-center space-x-2 text-xs text-zinc-300 font-medium">
                    <Sparkles className="w-4 h-4 text-teal-400" />
                    <span>歌詞の文字をタップして、「共鳴（ハート）」を湧き上がらせよう！</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                    LATENCY // EXTREME LOW
                  </span>
                </div>

                {/* Core Lyrics Stream Scroller Container */}
                <div
                  ref={lyricsContainerRef}
                  id="lyrics-view-deck"
                  className="relative z-10 flex-1 flex flex-col justify-center min-h-[220px] max-h-[340px] overflow-y-auto px-4 space-y-8 select-none"
                >
                  {/* PAST LYRIC NODES (Faded grey scroll) */}
                  {activePhraseInfo.pastPhrases.map((phrase) => (
                    <div
                      key={phrase.startTime}
                      className="text-center text-xs md:text-sm text-zinc-600/55 line-clamp-1 blur-[0.4px] transition-all duration-500"
                    >
                      {phrase.text}
                    </div>
                  ))}

                  {/* ACTIVE INTERACTIVE PLAYGROUND LYRIC BLOCK */}
                  <div className="active-lyric-box py-3.5 border-y border-zinc-800/30 text-center flex flex-col items-center justify-center space-y-2 select-none">
                    {activePhraseInfo.activePhrase ? (
                      <div className="flex flex-wrap items-center justify-center gap-y-3.5 max-w-xl mx-auto px-2">
                        {activePhraseInfo.activePhrase.words.map((wordNode, wordIdx) => (
                          <div
                            key={wordIdx}
                            className="inline-flex items-center mx-1.5 px-0.5 rounded-md"
                          >
                            {wordNode.chars.map((charNode, charIdx) => {
                              // Identify if this specific character is currently active in playback timeline
                              const isActive =
                                currentTime >= charNode.startTime &&
                                currentTime <= charNode.endTime;

                              return (
                                <motion.span
                                  key={charIdx}
                                  whileHover={{ scale: 1.25, y: -2 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) =>
                                    handleCharTap(
                                      e,
                                      charNode.char,
                                      activePhraseInfo.activePhrase?.text || ""
                                    )
                                  }
                                  className={`text-2xl md:text-3.5xl font-bold tracking-widest relative cursor-pointer px-0.5 select-none transition-all duration-150 ${
                                    isActive
                                      ? "text-teal-400 filter drop-shadow-[0_0_12px_#39C5BB] font-black scale-108"
                                      : "text-slate-100 hover:text-pink-400"
                                  }`}
                                >
                                  {charNode.char}
                                  
                                  {/* Pulsing glow ring backdrop inside active note */}
                                  {isActive && (
                                    <span className="absolute inset-x-0 bottom-[-4px] h-[3px] bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full shadow-[0_0_8px_#39C5BB]" />
                                  )}
                                </motion.span>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <em className="text-zinc-500 font-mono tracking-widest text-xs flex items-center space-x-1 bg-zinc-900/60 p-2 rounded-lg border border-zinc-800 animate-pulse">
                        <Music className="w-4 h-4 text-zinc-500" />
                        <span>♪ （奏間奏 - インタラクティブ準備）</span>
                      </em>
                    )}
                  </div>

                  {/* FUTURE UPCOMING LYRIC NODES (Semi-faded scroll) */}
                  {activePhraseInfo.futurePhrases.map((phrase) => (
                    <div
                      key={phrase.startTime}
                      className="text-center text-xs md:text-sm text-zinc-500/40 line-clamp-1 transition-all duration-300"
                    >
                      {phrase.text}
                    </div>
                  ))}
                </div>

                {/* BOTTOM PLAYER BAR - SEEK CONTROLS */}
                <div className="relative z-10 space-y-4 pt-4 border-t border-zinc-800/80">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    
                    {/* Media Actions */}
                    <div className="flex items-center space-x-4">
                      {isPlaying ? (
                        <button
                          onClick={handlePause}
                          className="w-11 h-11 bg-pink-500 hover:bg-pink-600 shadow-xl shadow-pink-500/25 rounded-full flex items-center justify-center transition-all cursor-pointer scale-100 hover:scale-105 active:scale-95"
                          id="btn-media-pause"
                        >
                          <Pause className="w-5 h-5 text-zinc-950 font-black fill-zinc-950" />
                        </button>
                      ) : (
                        <button
                          onClick={handlePlayStart}
                          className="w-11 h-11 bg-teal-400 hover:bg-teal-500 shadow-xl shadow-teal-500/25 rounded-full flex items-center justify-center transition-all cursor-pointer scale-100 hover:scale-105 active:scale-95"
                          id="btn-media-play"
                        >
                          <Play className="w-5 h-5 text-zinc-950 font-black fill-zinc-950 translation-x-0.5" />
                        </button>
                      )}

                      <button
                        onClick={handleResetPlayback}
                        className="p-2 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-all cursor-pointer"
                        title="曲を最初からやり直す"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Progress slider info */}
                    <div className="flex-1 w-full flex items-center space-x-3 text-xs font-mono">
                      <span className="text-zinc-500">
                        {Math.floor(currentTime / 60000)}:
                        {Math.floor((currentTime % 60000) / 1000)
                          .toString()
                          .padStart(2, "0")}
                      </span>

                      {/* Custom styled absolute progress bar */}
                      <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 relative shadow-inner">
                        <div
                          className="h-full bg-gradient-to-r from-teal-400 to-pink-400 shadow-[0_0_6px_rgba(57,197,187,0.8)] rounded-full transition-all duration-100 ease-out"
                          style={{
                            width: `${Math.min(100, (currentTime / (selectedSong.duration * 1000)) * 100)}%`,
                          }}
                        />
                      </div>

                      <span className="text-zinc-500">
                        {Math.floor((selectedSong.duration * 1000) / 60000)}:
                        {Math.floor(((selectedSong.duration * 1000) % 60000) / 1000)
                          .toString()
                          .padStart(2, "0")}
                      </span>
                    </div>

                    {/* Force view results button! */}
                    <button
                      onClick={handleEnded}
                      className="w-full sm:w-auto py-2 px-4 bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 hover:border-teal-900 text-teal-400 flex items-center justify-center space-x-1 hover:text-teal-300 shadow-md rounded-xl text-xs font-mono transition-all cursor-pointer hover:shadow-teal-950/20"
                    >
                      <span>演奏終了 (結果一覧)</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Micro YouTube standard container frame needed underneath for the TextAlive API iframe injection */}
                <div id="textalive-video-holder" className="hidden" />
              </div>
            </motion.div>
          )}

          {/*================ SCREEN 3: RESULTS SCREEN ================*/}
          {screen === AppScreen.RESULT && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col space-y-6 pt-2 pb-6 max-w-2xl mx-auto"
            >
              {/* Giant results celebration cards card */}
              <div id="results-headline-card" className="relative overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl flex flex-col items-center justify-center text-center space-y-4">
                {/* Background flare */}
                <div className={`absolute -top-10 -left-10 w-44 h-44 bg-gradient-to-br ${selectedSong.accentColor} rounded-full blur-3xl opacity-20`} />

                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
                  className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#39C5BB] to-pink-500 flex items-center justify-center shadow-xl shadow-pink-500/20"
                >
                  <Award className="w-8 h-8 text-zinc-950" />
                </motion.div>

                <div className="space-y-1 z-10">
                  <h2 className="text-xl font-bold font-display tracking-widest text-white">あなたの感情共鳴マップ</h2>
                  <p className="text-xs text-zinc-400">曲の再生時間ごとのタップ度（感情の熱量）のゆらぎです</p>
                </div>

                {/* Score panel */}
                <div className="grid grid-cols-2 gap-4 max-w-xs w-full pt-2 z-10">
                  <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 text-center flex flex-col justify-center">
                    <span className="block text-[10px] text-zinc-500 font-mono">総タップ数 (刺さった回数)</span>
                    <strong className="text-2xl text-pink-500 font-display font-black tracking-widest font-mono">
                      {resonanceLogs.length}回
                    </strong>
                  </div>
                  <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 text-center flex flex-col justify-center">
                    <span className="block text-[10px] text-zinc-500 font-mono">1秒あたりタップ密度</span>
                    <strong className="text-2xl text-teal-400 font-display font-black tracking-widest font-mono">
                      {((resonanceLogs.length / selectedSong.duration) || 0).toFixed(1)}点
                    </strong>
                  </div>
                </div>
              </div>

              {/* INTERACTIVE GRAPH PLOT */}
              <div className="z-10">
                <ResultChart song={selectedSong} logs={resonanceLogs} />
              </div>

              {/* RESULTS SUMMARY BOTTOM ROW ACTIONS */}
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 z-10 justify-between">
                {/* Reset restart button */}
                <button
                  onClick={() => {
                    setResonanceLogs([]);
                    setCurrentTime(0);
                    setScreen(AppScreen.TOP_SELECT);
                  }}
                  className="w-full sm:w-auto py-3 px-6 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:text-white text-zinc-300 font-semibold rounded-xl text-xs font-mono tracking-widest flex items-center justify-center space-x-1.5 transition-all scale-100 active:scale-95 cursor-pointer shadow-md"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>もう一度共鳴する (トップへ)</span>
                </button>

                {/* Open Share dialog */}
                <button
                  onClick={() => setShowShareModal(true)}
                  className="w-full sm:w-auto py-3 px-6 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 shadow-xl shadow-teal-500/25 text-zinc-950 font-bold rounded-xl text-xs font-mono tracking-widest flex items-center justify-center space-x-2 transition-all scale-100 active:scale-95 cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-zinc-950 font-bold" />
                  <span>X (Twitter) / 共有する</span>
                </button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* SHARE MODAL DIALOG POPUP */}
      <AnimatePresence>
        {showShareModal && (
          <div id="share-modal-backdrop" className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 text-[#f3f4f6] p-6 rounded-2xl max-w-md w-full space-y-4 relative shadow-2xl"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowShareModal(false)}
                className="absolute top-4 right-4 p-1.5 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-white tracking-wide">結果を共有・ツイート</h3>
                <p className="text-xs text-zinc-400 font-mono">SNSに投稿する文章がクリップボードにもコピーされます</p>
              </div>

              {/* Block view of the content text */}
              <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-805 text-xs text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap select-text h-[180px] overflow-y-auto">
                {getShareText()}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {/* Copy */}
                <button
                  onClick={handleCopyToClipboard}
                  className={`py-2 px-4 rounded-xl border text-xs font-mono tracking-wider flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    copiedLink
                      ? "bg-emerald-950 border-emerald-500 text-emerald-400"
                      : "bg-zinc-950 border-zinc-800 hover:border-zinc-700 hover:text-white text-zinc-400"
                  }`}
                >
                  {copiedLink ? <Check className="w-4.5 h-4.5" /> : <Copy className="w-4.5 h-4.5" />}
                  <span>{copiedLink ? "コピー完了！" : "文章をコピー"}</span>
                </button>

                {/* Twitter Share */}
                <button
                  onClick={handleTwitterShare}
                  className="py-2 px-4 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white font-bold rounded-xl text-xs font-mono tracking-wider flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                >
                  <Share2 className="w-4.5 h-4.5 text-white" />
                  <span>X (Twitter) 投稿</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER BAR */}
      <footer className="relative z-10 text-center py-2 border-t border-zinc-900 mt-4 select-none">
        <p className="text-[10px] text-zinc-600 font-mono">
          &copy; 2026 KYOMEI MAP CONTEST ENTRY // ALL RIGHTS RESERVED // CONCEPT DRIVEN FRONTEND INSPIRED BY RECMUS RESEARCH
        </p>
      </footer>
    </div>
  );
}
