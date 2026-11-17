export interface SoundSettings {
  /** المؤثرات الصوتية (صح/خطأ/إكمال) */
  effects: boolean;
  /** القراءة الصوتية للنصوص (زر استمع) */
  tts: boolean;
  /** مستوى الصوت 0..1 */
  volume: number;
  /** سرعة القراءة 0.6..1.3 */
  rate: number;
}

export interface CompetitionSettings {
  /** زمن كل سؤال في المسابقة المباشرة بالثواني */
  seconds: number;
}

export interface AppSettings {
  sound: SoundSettings;
  competition: CompetitionSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  sound: { effects: true, tts: true, volume: 0.8, rate: 0.9 },
  competition: { seconds: 20 },
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function sanitizeSettings(input: unknown, base: AppSettings = DEFAULT_SETTINGS): AppSettings {
  const obj = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const s = (obj.sound && typeof obj.sound === "object" ? obj.sound : {}) as Record<string, unknown>;
  const c = (obj.competition && typeof obj.competition === "object" ? obj.competition : {}) as Record<string, unknown>;
  return {
    sound: {
      effects: typeof s.effects === "boolean" ? s.effects : base.sound.effects,
      tts: typeof s.tts === "boolean" ? s.tts : base.sound.tts,
      volume: typeof s.volume === "number" && Number.isFinite(s.volume) ? clamp(s.volume, 0, 1) : base.sound.volume,
      rate: typeof s.rate === "number" && Number.isFinite(s.rate) ? clamp(s.rate, 0.6, 1.3) : base.sound.rate,
    },
    competition: {
      seconds:
        typeof c.seconds === "number" && Number.isFinite(c.seconds)
          ? clamp(Math.round(c.seconds), 10, 90)
          : base.competition.seconds,
    },
  };
}
