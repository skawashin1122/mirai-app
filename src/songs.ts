/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SongMetadata, LyricPhrase } from "./types";

// Helper function to build detailed timed lyrics structures from clean timed phrases
function createSongLyrics(
  phrases: { text: string; start: number; end: number }[]
): LyricPhrase[] {
  return phrases.map((ph) => {
    const text = ph.text;
    const duration = ph.end - ph.start;
    const totalChars = text.replace(/\s+/g, "").length;
    const charDuration = duration / (totalChars || 1);

    const charsList = [];
    let activeCharIdx = 0;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (/\s/.test(c)) {
        // Space character, give it a tiny duration and no index increment
        charsList.push({
          char: c,
          startTime: ph.start + activeCharIdx * charDuration,
          endTime: ph.start + activeCharIdx * charDuration + 10,
        });
      } else {
        charsList.push({
          char: c,
          startTime: ph.start + activeCharIdx * charDuration,
          endTime: ph.start + (activeCharIdx + 1) * charDuration,
        });
        activeCharIdx++;
      }
    }

    // Split words by space, or fall back to character groups
    const wordsList = [];
    const tokens = text.split(" ");
    let charCounter = 0;

    tokens.forEach((token, idx) => {
      const tokenCharCount = token.length;
      const tokenChars = charsList.slice(charCounter, charCounter + tokenCharCount);
      
      // Calculate token start and end time from characters
      const startTime = tokenChars[0]?.startTime ?? ph.start;
      const endTime = tokenChars[tokenChars.length - 1]?.endTime ?? ph.end;

      wordsList.push({
        word: token,
        startTime,
        endTime,
        chars: tokenChars,
      });

      charCounter += tokenCharCount + (idx < tokens.length - 1 ? 1 : 0); // account for space token
    });

    return {
      text,
      startTime: ph.start,
      endTime: ph.end,
      words: wordsList,
    };
  });
}

export const songs: SongMetadata[] = [
  {
    id: "melt",
    title: "メルト",
    artist: "ryo (supercell) feat. 初音ミク",
    bpm: 170,
    duration: 52,
    coverUrl: "",
    accentColor: "from-[#39C5BB] to-[#2E9B93]", // Miku Cyan
    description: "心揺さぶる恋心の高鳴りと、溶けそうに甘く切ない感情の共鳴波形をその手で体感してください。",
    lyrics: createSongLyrics([
      { text: "朝　目が覚めて", start: 1500, end: 4000 },
      { text: "真っ先に思い浮かぶ　君のこと", start: 4500, end: 9000 },
      { text: "思い切って　髪型を変えた", start: 9500, end: 14000 },
      { text: "「どうしたの？」って", start: 14200, end: 16500 },
      { text: "聞かれたくて", start: 16800, end: 19000 },
      { text: "ピンクのスカート　お気に入りのフード", start: 19500, end: 24000 },
      { text: "ヒールを合わせて　おめかししたの", start: 24500, end: 29000 },
      { text: "メルト！　溶けてしまいそう", start: 30000, end: 34500 },
      { text: "好きだなんて　絶対に言えない", start: 35000, end: 39500 },
      { text: "だけど　メルト　目も合わせられない", start: 40000, end: 44500 },
      { text: "恋に落ちる音がした", start: 45000, end: 50000 },
    ]),
  },
  {
    id: "greenlights",
    title: "グリーンライツ・セレナーデ",
    artist: "Omoi feat. 初音ミク",
    bpm: 185,
    duration: 54,
    coverUrl: "",
    accentColor: "from-[#39C5BB] to-[#FF1493]", // Miku Cyan  Pink
    description: "輝くグリーンライト。未来への物語を告げる奇跡のファンファーレ。心の奥深くの情熱に共鳴させて。",
    lyrics: createSongLyrics([
      { text: "輝く風が吹き抜ける", start: 1500, end: 4200 },
      { text: "物語が今　始まっていく", start: 4800, end: 9200 },
      { text: "僕らは未来を信じているから", start: 9800, end: 14200 },
      { text: "どんな暗闇も　照らし出して", start: 14800, end: 19200 },
      { text: "ミクの歌声が　響けば", start: 19800, end: 24200 },
      { text: "奇跡さえも起こせるよ", start: 24800, end: 29200 },
      { text: "照らせ！　もっと先まで", start: 30500, end: 35200 },
      { text: "輝きを放つ　グリーンライツ", start: 35800, end: 40200 },
      { text: "君と僕の共鳴は", start: 40800, end: 45200 },
      { text: "明日を創る　エネルギー", start: 45800, end: 51000 },
    ]),
  },
  {
    id: "blessyourbreath",
    title: "ブレス・ユア・ブレス",
    artist: "和田たけあき feat. 初音ミク",
    bpm: 140,
    duration: 53,
    coverUrl: "",
    accentColor: "from-[#E63946] to-[#457B9D]", // Bold Red & Metal Slate Blue
    description: "ハロー、ハロー。命の息吹を吹き込むような、力強く泥臭くも愛おしい心音と鼓動のシンクロ波形。",
    lyrics: createSongLyrics([
      { text: "ハロー・ハロー　聞こえますか", start: 1500, end: 4200 },
      { text: "息をしている　僕らの声", start: 4800, end: 9200 },
      { text: "生まれ変わるように　歌おう", start: 9800, end: 14200 },
      { text: "最初の感情を　思い出して", start: 14800, end: 19200 },
      { text: "何もかもが色褪せても", start: 19800, end: 24200 },
      { text: "このメロディは消え去らない", start: 24800, end: 29200 },
      { text: "叫べ！　命の限りに", start: 30500, end: 35200 },
      { text: "ブレス・ユア・ブレス　熱い鼓動", start: 35800, end: 40200 },
      { text: "君がくれたこの世界で", start: 40800, end: 45200 },
      { text: "愛を込めて歌い継ごう", start: 45800, end: 51200 },
    ]),
  },
];
