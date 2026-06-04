/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Procedural Web Audio Synth for Vocaloid Chiptune instrumental loops
// This guarantees that the app remains fully functional, beautifully audible,
// and 100% reliable inside any sandboxed environment or even offline!

class AudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private bpm: number = 120;
  private songId: string = "";
  private duration: number = 60; // in seconds
  private lastTickTime: number = 0;
  private elapsedSeconds: number = 0;
  private intervalId: any = null;
  private onTimeUpdate: (ms: number) => void = () => {};
  private onEnded: () => void = () => {};
  private startTimeOffset: number = 0;
  private pausedTime: number = 0;
  private timerStart: number = 0;

  // Synthesizer parameters
  private nextNoteTime: number = 0;
  private stepIndex: number = 0;
  private lookAhead: number = 0.1; // seconds
  private scheduleInterval: number = 30; // ms
  private schedulerTimerId: any = null;

  constructor() {}

  private initContext() {
    if (!this.ctx) {
      // @ts-ignore
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public setSong(songId: string, bpm: number, duration: number) {
    this.songId = songId;
    this.bpm = bpm;
    this.duration = duration;
    this.pausedTime = 0;
  }

  public play(onTimeUpdate: (ms: number) => void, onEnded: () => void) {
    this.initContext();
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.onTimeUpdate = onTimeUpdate;
    this.onEnded = onEnded;

    if (this.ctx) {
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      this.timerStart = this.ctx.currentTime - this.pausedTime;
    } else {
      this.timerStart = Date.now() / 1000 - this.pausedTime;
    }

    // Start timeline interval updates
    this.intervalId = setInterval(() => {
      this.tick();
    }, 16);

    // Start pattern sequencer
    if (this.ctx) {
      this.nextNoteTime = this.ctx.currentTime;
      this.stepIndex = 0;
      this.schedulerTimerId = setInterval(() => {
        this.scheduler();
      }, this.scheduleInterval);
    }
  }

  public pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.schedulerTimerId) {
      clearInterval(this.schedulerTimerId);
      this.schedulerTimerId = null;
    }

    if (this.ctx) {
      this.pausedTime = this.ctx.currentTime - this.timerStart;
    } else {
      this.pausedTime = Date.now() / 1000 - this.timerStart;
    }
  }

  public stop() {
    this.pause();
    this.pausedTime = 0;
  }

  public getCurrentTimeMs(): number {
    if (!this.isPlaying) {
      return Math.round(this.pausedTime * 1000);
    }
    if (this.ctx) {
      return Math.round((this.ctx.currentTime - this.timerStart) * 1000);
    }
    return Math.round((Date.now() / 1000 - this.timerStart) * 1000);
  }

  private tick() {
    const elapsedMs = this.getCurrentTimeMs();
    this.onTimeUpdate(elapsedMs);

    if (elapsedMs >= this.duration * 1000) {
      this.pause();
      this.pausedTime = 0;
      this.onEnded();
    }
  }

  // Chiptune metronome/sequencer schedulers
  private scheduler() {
    if (!this.ctx) return;
    while (this.nextNoteTime < this.ctx.currentTime + this.lookAhead) {
      this.scheduleNote(this.stepIndex, this.nextNoteTime);
      this.advanceNote();
    }
  }

  private advanceNote() {
    if (!this.ctx) return;
    const secondsPerBeat = 60.0 / this.bpm;
    const durationOfStep = secondsPerBeat / 4; // 16th notes
    this.nextNoteTime += durationOfStep;
    this.stepIndex = (this.stepIndex + 1) % 16;
  }

  private scheduleNote(step: number, time: number) {
    if (!this.ctx) return;

    // Retrieve synth configuration depending on chosen Vocaloid song
    let drumPattern: boolean[] = [];
    let hatPattern: boolean[] = [];
    let melNotes: number[] = [];
    let bassNotes: number[] = [];

    if (this.songId === "melt") {
      // "Melt" is energetic and melodic. Cute chord progression.
      drumPattern = [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false];
      hatPattern =  [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, true];
      // Melodic notes in MIDI numbers (F major): F5, G5, A5, C6...
      melNotes = [65, 67, 69, 72, 69, 72, 77, 72, 69, 67, 65, 67, 69, 65, 69, 72];
      bassNotes = [41, 41, 48, 48, 45, 45, 53, 53, 41, 41, 48, 48, 46, 46, 50, 50];
    } else if (this.songId === "greenlights") {
      // "Greenlights Serenade" is fast (185 BPM) in C Major. Power chords!
      drumPattern = [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, true];
      hatPattern =  [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true];
      melNotes = [60, 64, 67, 72, 67, 72, 76, 72, 69, 72, 76, 79, 76, 72, 67, 64];
      bassNotes = [36, 36, 43, 43, 40, 40, 48, 48, 33, 33, 45, 45, 38, 38, 43, 43];
    } else {
      // "Bless Your Breath" (140 BPM) has a driving rock/electro swing vibe.
      drumPattern = [true, false, false, false, false, false, true, false, true, false, false, false, false, false, true, false];
      hatPattern =  [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false];
      melNotes = [57, 60, 62, 64, 62, 64, 67, 64, 69, 67, 64, 62, 60, 57, 60, 62];
      bassNotes = [33, 33, 33, 33, 36, 36, 36, 36, 38, 38, 38, 38, 33, 33, 35, 35];
    }

    // Play kick drum on grid
    if (drumPattern[step]) {
      this.playKick(time);
    }

    // Play hi-hat
    if (hatPattern[step]) {
      this.playHat(time);
    }

    // Play mel notes (subtle, beautiful chime)
    if (step % 2 === 0) {
      const midi = melNotes[step];
      const freq = this.midiToFreq(midi);
      this.playChime(freq, time, 0.1, 0.04);
    }

    // Play driving bass line
    if (step % 4 === 0) {
      const bMidi = bassNotes[step];
      const bFreq = this.midiToFreq(bMidi);
      this.playBass(bFreq, time, 0.18, 0.05);
    }
  }

  private midiToFreq(note: number): number {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  // Instrument Voice creators
  private playKick(time: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);

    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

    osc.start(time);
    osc.stop(time + 0.16);
  }

  private playHat(time: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Noise emulation utilizing high frequency square/triangle
    osc.type = "triangle";
    osc.frequency.setValueAtTime(10000, time);

    const bpf = this.ctx.createBiquadFilter();
    bpf.type = "bandpass";
    bpf.frequency.setValueAtTime(8000, time);

    osc.connect(bpf);
    bpf.connect(gain);
    gain.connect(this.ctx.destination);

    gain.gain.setValueAtTime(0.04, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  private playChime(freq: number, time: number, duration: number, volume: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle"; // Soft retro bell
    osc.frequency.setValueAtTime(freq, time);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.start(time);
    osc.stop(time + duration);
  }

  private playBass(freq: number, time: number, duration: number, volume: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "sawtooth"; // Thick retro synth bass
    osc.frequency.setValueAtTime(freq, time);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, time);
    filter.Q.setValueAtTime(1, time);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.start(time);
    osc.stop(time + duration);
  }

  // UI interaction chime feedback (very pleasant pink/mint-toned synth ping)
  public playHitSound(character: string) {
    this.initContext();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Pitch depending on selected character code
    const charCode = character.charCodeAt(0) || 60;
    const pitchMidi = 60 + (charCode % 24); // range from middle C to C+2 octs
    const freq = this.midiToFreq(pitchMidi);

    osc.type = "sine"; 
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, time + 0.08); // micro tonal bend

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

    osc.start(time);
    osc.stop(time + 0.25);
  }

  // Triggers big "Dokun..." heartbeat transition sound
  public playHeartbeat() {
    this.initContext();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.frequency.setValueAtTime(55, time); // Low G
    osc2.frequency.setValueAtTime(56, time); // Beating detune

    osc1.type = "sine";
    osc2.type = "sine";

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    // Two rapid pulse peaks (Dokun!)
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(0.8, time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.1, time + 0.25);
    
    // Second thump
    gain.gain.setValueAtTime(0.1, time + 0.28);
    gain.gain.exponentialRampToValueAtTime(0.7, time + 0.33);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.7);

    osc1.start(time);
    osc2.start(time);
    
    osc1.stop(time + 0.7);
    osc2.stop(time + 0.7);
  }
}

export const audioEngine = new AudioEngine();
export default audioEngine;
