export interface StationOutcome {
  points: number;
  tries: number;
}

export interface SoundApi {
  muted: boolean;
  /** هل القراءة الآلية متاحة (حسب إعدادات المعلم وحالة الكتم)؟ */
  ttsEnabled: boolean;
  effectsEnabled: boolean;
  /** هل يمكن إظهار زر «استمع» لهذه الخانة (تسجيل معلم أو قراءة آلية)؟ */
  canListen: (slotKey?: string) => boolean;
  toggleMute: () => void;
  playCorrect: () => void;
  playWrong: () => void;
  playComplete: () => void;
  playClick: () => void;
  /** قراءة نص؛ إن وُجد تسجيل للمعلم في slotKey يُشغَّل بدل القراءة الآلية */
  speak: (text: string, slotKey?: string) => void;
  stopSpeaking: () => void;
}

export interface ActivityProps<T> {
  station: T;
  sound: SoundApi;
  onComplete: (outcome: StationOutcome) => void;
}

export interface FeedbackState {
  kind: "ok" | "bad" | "info";
  text: string;
}
