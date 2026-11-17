"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { SoundApi } from "./types";

interface Note {
  freq: number;
  at: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
}

export function useSound(): SoundApi {
  const ctxRef = useRef<AudioContext | null>(null);
  const mutedRef = useRef(false);
  const [muted, setMuted] = useState(false);

  const getCtx = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctxRef.current = new Ctor();
    }
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const play = useCallback(
    (notes: Note[]) => {
      if (mutedRef.current) return;
      try {
        const ctx = getCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        for (const n of notes) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = n.type ?? "triangle";
          osc.frequency.value = n.freq;
          const start = now + n.at;
          const peak = n.gain ?? 0.16;
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + n.dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + n.dur + 0.05);
        }
      } catch {
        /* الصوت غير متاح — نتجاهل بصمت */
      }
    },
    [getCtx],
  );

  const playCorrect = useCallback(
    () =>
      play([
        { freq: 523.25, at: 0, dur: 0.18 },
        { freq: 659.25, at: 0.12, dur: 0.18 },
        { freq: 783.99, at: 0.24, dur: 0.32 },
      ]),
    [play],
  );

  const playWrong = useCallback(
    () =>
      play([
        { freq: 220, at: 0, dur: 0.2, type: "square", gain: 0.07 },
        { freq: 174.6, at: 0.18, dur: 0.3, type: "square", gain: 0.07 },
      ]),
    [play],
  );

  const playComplete = useCallback(
    () =>
      play([
        { freq: 523.25, at: 0, dur: 0.15 },
        { freq: 659.25, at: 0.12, dur: 0.15 },
        { freq: 783.99, at: 0.24, dur: 0.15 },
        { freq: 1046.5, at: 0.36, dur: 0.4 },
        { freq: 783.99, at: 0.62, dur: 0.12 },
        { freq: 1046.5, at: 0.74, dur: 0.6 },
      ]),
    [play],
  );

  const playClick = useCallback(() => play([{ freq: 880, at: 0, dur: 0.06, type: "sine", gain: 0.07 }]), [play]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (mutedRef.current || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ar-SA";
      utterance.rate = 0.88;
      const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("ar"));
      if (voice) utterance.voice = voice;
      window.speechSynthesis.speak(utterance);
    } catch {
      /* غير مدعوم */
    }
  }, []);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    setMuted(mutedRef.current);
    if (mutedRef.current) stopSpeaking();
  }, [stopSpeaking]);

  return useMemo(
    () => ({ muted, toggleMute, playCorrect, playWrong, playComplete, playClick, speak, stopSpeaking }),
    [muted, toggleMute, playCorrect, playWrong, playComplete, playClick, speak, stopSpeaking],
  );
}
