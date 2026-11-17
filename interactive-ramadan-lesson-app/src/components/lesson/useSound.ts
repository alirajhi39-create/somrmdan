"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_SETTINGS, type SoundSettings } from "@/lib/settings-types";
import type { SoundApi } from "./types";

interface Note {
  freq: number;
  at: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
}

/**
 * مؤثرات صوتية (Web Audio) + قراءة صوتية (Speech Synthesis)
 * تخضع لإعدادات المعلم: تفعيل المؤثرات/القراءة، مستوى الصوت، سرعة القراءة.
 */
export function useSound(config?: SoundSettings): SoundApi {
  const ctxRef = useRef<AudioContext | null>(null);
  const mutedRef = useRef(false);
  const cfgRef = useRef<SoundSettings>(config ?? DEFAULT_SETTINGS.sound);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    cfgRef.current = config ?? DEFAULT_SETTINGS.sound;
  }, [config]);

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
      const cfg = cfgRef.current;
      if (mutedRef.current || !cfg.effects || cfg.volume <= 0) return;
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
          const peak = Math.max(0.0005, (n.gain ?? 0.16) * cfg.volume);
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + n.dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + n.dur + 0.05);
        }
      } catch {
        /* الصوت غير متاح */
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
    const cfg = cfgRef.current;
    if (mutedRef.current || !cfg.tts || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ar-SA";
      utterance.rate = cfg.rate;
      utterance.volume = Math.max(0, Math.min(1, cfg.volume));
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

  const ttsEnabled = (config?.tts ?? true) && !muted;
  const effectsEnabled = (config?.effects ?? true) && !muted;

  return useMemo(
    () => ({ muted, ttsEnabled, effectsEnabled, toggleMute, playCorrect, playWrong, playComplete, playClick, speak, stopSpeaking }),
    [muted, ttsEnabled, effectsEnabled, toggleMute, playCorrect, playWrong, playComplete, playClick, speak, stopSpeaking],
  );
}
