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

const EMPTY: Record<string, string> = {};

/**
 * مؤثرات صوتية (Web Audio) + قراءة صوتية (Speech Synthesis) + أصوات المعلم المخصصة (ملفات/تسجيلات)
 * تخضع لإعدادات المعلم: تفعيل المؤثرات/القراءة، مستوى الصوت، سرعة القراءة.
 * @param config إعدادات الصوت
 * @param custom خريطة: مفتاح الخانة ← رابط الصوت المخصص (إن وُجد يُشغَّل بدل الافتراضي)
 */
export function useSound(config?: SoundSettings, custom?: Record<string, string>): SoundApi {
  const ctxRef = useRef<AudioContext | null>(null);
  const mutedRef = useRef(false);
  const cfgRef = useRef<SoundSettings>(config ?? DEFAULT_SETTINGS.sound);
  const customRef = useRef<Record<string, string>>(custom ?? EMPTY);
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    cfgRef.current = config ?? DEFAULT_SETTINGS.sound;
  }, [config]);

  useEffect(() => {
    customRef.current = custom ?? EMPTY;
  }, [custom]);

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

  /** تشغيل صوت مخصص إن وُجد — يعيد true إذا وُجدت خانة مخصصة */
  const playCustom = useCallback((slotKey: string): boolean => {
    const url = customRef.current[slotKey];
    if (!url) return false;
    const cfg = cfgRef.current;
    if (mutedRef.current || cfg.volume <= 0) return true;
    try {
      let audio = audioCache.current.get(url);
      if (!audio) {
        audio = new Audio(url);
        audio.preload = "auto";
        audioCache.current.set(url, audio);
      }
      audio.volume = Math.max(0, Math.min(1, cfg.volume));
      audio.currentTime = 0;
      void audio.play().catch(() => {});
    } catch {
      /* تجاهل */
    }
    return true;
  }, []);

  const stopCustom = useCallback(() => {
    audioCache.current.forEach((a) => {
      try {
        a.pause();
      } catch {
        /* تجاهل */
      }
    });
  }, []);

  const synth = useCallback(
    (notes: Note[]) => {
      const cfg = cfgRef.current;
      if (cfg.volume <= 0) return;
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

  /** مؤثر: يُفضَّل الصوت المخصص للخانة، وإلا النغمة الافتراضية */
  const fx = useCallback(
    (slotKey: string, notes: Note[]) => {
      if (mutedRef.current || !cfgRef.current.effects) return;
      if (playCustom(slotKey)) return;
      synth(notes);
    },
    [playCustom, synth],
  );

  const playCorrect = useCallback(
    () =>
      fx("fx-correct", [
        { freq: 523.25, at: 0, dur: 0.18 },
        { freq: 659.25, at: 0.12, dur: 0.18 },
        { freq: 783.99, at: 0.24, dur: 0.32 },
      ]),
    [fx],
  );

  const playWrong = useCallback(
    () =>
      fx("fx-wrong", [
        { freq: 220, at: 0, dur: 0.2, type: "square", gain: 0.07 },
        { freq: 174.6, at: 0.18, dur: 0.3, type: "square", gain: 0.07 },
      ]),
    [fx],
  );

  const playComplete = useCallback(
    () =>
      fx("fx-complete", [
        { freq: 523.25, at: 0, dur: 0.15 },
        { freq: 659.25, at: 0.12, dur: 0.15 },
        { freq: 783.99, at: 0.24, dur: 0.15 },
        { freq: 1046.5, at: 0.36, dur: 0.4 },
        { freq: 783.99, at: 0.62, dur: 0.12 },
        { freq: 1046.5, at: 0.74, dur: 0.6 },
      ]),
    [fx],
  );

  const playClick = useCallback(() => {
    if (mutedRef.current || !cfgRef.current.effects) return;
    synth([{ freq: 880, at: 0, dur: 0.06, type: "sine", gain: 0.07 }]);
  }, [synth]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    stopCustom();
  }, [stopCustom]);

  /** قراءة نص: تسجيل المعلم للخانة إن وُجد، وإلا القراءة الآلية */
  const speak = useCallback(
    (text: string, slotKey?: string) => {
      if (mutedRef.current || typeof window === "undefined") return;
      stopSpeaking();
      if (slotKey && playCustom(slotKey)) return;
      const cfg = cfgRef.current;
      if (!cfg.tts || !("speechSynthesis" in window)) return;
      try {
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
    },
    [playCustom, stopSpeaking],
  );

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    setMuted(mutedRef.current);
    if (mutedRef.current) stopSpeaking();
  }, [stopSpeaking]);

  const ttsEnabled = (config?.tts ?? true) && !muted;
  const effectsEnabled = (config?.effects ?? true) && !muted;

  const canListen = useCallback(
    (slotKey?: string) => {
      if (muted) return false;
      if (slotKey && custom && custom[slotKey]) return true;
      return config?.tts ?? true;
    },
    [muted, custom, config],
  );

  return useMemo(
    () => ({
      muted,
      ttsEnabled,
      effectsEnabled,
      canListen,
      toggleMute,
      playCorrect,
      playWrong,
      playComplete,
      playClick,
      speak,
      stopSpeaking,
    }),
    [muted, ttsEnabled, effectsEnabled, canListen, toggleMute, playCorrect, playWrong, playComplete, playClick, speak, stopSpeaking],
  );
}
