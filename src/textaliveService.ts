/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Player } from "textalive-app-api";

// Mapping of song ID to corresponding public URLs with certified lyrics in TextAlive database
export const SONG_URLS: Record<string, string> = {
  melt: "https://www.youtube.com/watch?v=o1jAMSQqU-M", // Melt feat. Hatsune Miku original
  greenlights: "https://www.youtube.com/watch?v=XSLhsjepelI", // Greenlights Serenade original
  blessyourbreath: "https://www.youtube.com/watch?v=a-Nf3QUFkOU" // Bless Your Breath original
};

export class TextAliveService {
  private player: Player | null = null;
  private isReady: boolean = false;
  private onTimeUpdateCallback: (ms: number) => void = () => {};
  private onWordActiveCallback: (word: string) => void = () => {};
  private onStateChangeCallback: (status: string) => void = () => {};
  private onEndedCallback: () => void = () => {};

  constructor() {}

  public initialize(
    mediaContainerId: string,
    onTimeUpdate: (ms: number) => void,
    onWordActive: (word: string) => void,
    onStateChange: (status: string) => void,
    onEnded: () => void
  ) {
    this.onTimeUpdateCallback = onTimeUpdate;
    this.onWordActiveCallback = onWordActive;
    this.onStateChangeCallback = onStateChange;
    this.onEndedCallback = onEnded;

    try {
      const container = document.getElementById(mediaContainerId);
      if (!container) {
        onStateChange("error: container_missing");
        return;
      }

      // Initialize TextAlive player
      // It will spawn an invisible or small media player in our designated element
      this.player = new Player({
        app: {
          appName: "共鳴マップ",
          appToken: "6r0g4m9Sctq18Zbe" // Public client container credential token placeholder
        },
        mediaElement: container
      });

      this.player.addListener({
        onAppReady: (app) => {
          this.onStateChangeCallback("ready");
        },
        onTimerReady: () => {
          this.isReady = true;
          this.onStateChangeCallback("loaded");
        },
        onTimeUpdate: (position) => {
          this.onTimeUpdateCallback(position);
        },
        onPlay: () => {
          this.onStateChangeCallback("playing");
        },
        onPause: () => {
          this.onStateChangeCallback("paused");
        },
        onStop: () => {
          this.onStateChangeCallback("stopped");
          this.onEndedCallback();
        },
        onThrottledTimeUpdate: (position) => {
          // high density timers
        }
      });
    } catch (e) {
      console.warn("TextAlive API initialization failed (sandboxed iframe constraints?):", e);
      onStateChange("error: sandbox_failed");
    }
  }

  public loadSong(songId: string) {
    if (!this.player) return;
    const url = SONG_URLS[songId];
    if (url) {
      this.isReady = false;
      this.onStateChangeCallback("loading");
      this.player.createFromSongUrl(url).catch((err) => {
        console.error("Failed to load song from URL:", url, err);
        this.onStateChangeCallback("error: load_failed");
      });
    }
  }

  public play() {
    if (this.player && this.isReady) {
      this.player.requestPlay();
    }
  }

  public pause() {
    if (this.player) {
      this.player.requestPause();
    }
  }

  public stop() {
    if (this.player) {
      this.player.requestStop();
    }
  }

  public dispose() {
    if (this.player) {
      try {
        this.player.dispose();
      } catch (e) {
        console.error("Failed to dispose TextAlive player", e);
      }
      this.player = null;
      this.isReady = false;
    }
  }
}

export const textAliveService = new TextAliveService();
export default textAliveService;
