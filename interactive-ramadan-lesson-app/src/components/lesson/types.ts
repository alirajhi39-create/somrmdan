export interface StationOutcome {
  points: number;
  tries: number;
}

export interface SoundApi {
  muted: boolean;
  toggleMute: () => void;
  playCorrect: () => void;
  playWrong: () => void;
  playComplete: () => void;
  playClick: () => void;
  speak: (text: string) => void;
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
