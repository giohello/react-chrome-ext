import { useState, useEffect, useCallback } from "react";
import {
  SPEECH_RATE_DEFAULT,
  DEFAULT_ELEVENLABS_VOICE_ID,
  STORAGE_KEYS,
  DEFAULT_GEMINI_DAILY_LIMIT,
} from "../constants";
import {
  clampSpeechRate,
  SPEECH_RATE_MIN,
  SPEECH_RATE_MAX,
  SPEECH_RATE_STEP,
} from "../speechConfig";
import { DEFAULT_LANGUAGE_CODE } from "../languages";

const chromeApi = (window as any).chrome;

export interface Settings {
  aiEnabled: boolean;
  apiKey: string;
  hasSavedKey: boolean;
  speechRate: number;
  speechLang: string;
  forcedVoiceName: string;
  elevenLabsKey: string;
  elevenLabsVoiceId: string;
  elevenLabsSavedKey: boolean;
  useElevenLabs: boolean;
}

export interface GeminiUsage {
  used: number;
  limit: number;
  rateLimitedUntil: number;
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>({
    aiEnabled: false,
    apiKey: "",
    hasSavedKey: false,
    speechRate: SPEECH_RATE_DEFAULT,
    speechLang: DEFAULT_LANGUAGE_CODE,
    forcedVoiceName: "",
    elevenLabsKey: "",
    elevenLabsVoiceId: DEFAULT_ELEVENLABS_VOICE_ID,
    elevenLabsSavedKey: false,
    useElevenLabs: false,
  });

  const [geminiUsage, setGeminiUsage] = useState<GeminiUsage | null>(null);

  const patch = useCallback((partial: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const refreshGeminiUsage = useCallback(() => {
    if (!chromeApi?.storage?.local?.get) return;

    chromeApi.storage.local.get(
      [
        STORAGE_KEYS.geminiCallLog,
        STORAGE_KEYS.geminiDailyLimit,
        STORAGE_KEYS.aiRateLimitedUntil,
      ],
      (result: any) => {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const log: number[] = Array.isArray(result.geminiCallLog)
          ? result.geminiCallLog
          : [];
        const used = log.filter((t) => t > oneDayAgo).length;
        const limit =
          typeof result.geminiDailyLimit === "number"
            ? result.geminiDailyLimit
            : DEFAULT_GEMINI_DAILY_LIMIT;
        const rateLimitedUntil =
          typeof result.aiRateLimitedUntil === "number"
            ? result.aiRateLimitedUntil
            : 0;
        setGeminiUsage({ used, limit, rateLimitedUntil });
      },
    );
  }, []);

  const saveToStorage = useCallback(
    (updates: Partial<Record<string, unknown>>): Promise<void> => {
      if (!chromeApi?.storage?.local?.set) return Promise.resolve();

      return new Promise<void>((resolve) => {
        chromeApi.storage.local.set(updates, () => resolve());
      });
    },
    [],
  );

  const load = useCallback(() => {
    if (!chromeApi?.storage?.local?.get) return;

    chromeApi.storage.local.get(
      [
        STORAGE_KEYS.aiEnabled,
        STORAGE_KEYS.geminiKey,
        STORAGE_KEYS.speechRate,
        STORAGE_KEYS.speechLang,
        STORAGE_KEYS.forcedVoiceName,
        STORAGE_KEYS.elevenLabsKey,
        STORAGE_KEYS.elevenLabsVoiceId,
        STORAGE_KEYS.useElevenLabs,
      ],
      (result: any) => {
        patch({
          aiEnabled: Boolean(result.aiEnabled),
          apiKey: result.geminiKey || "",
          hasSavedKey: Boolean(result.geminiKey),
          speechRate: clampSpeechRate(
            typeof result.speechRate === "number"
              ? result.speechRate
              : SPEECH_RATE_DEFAULT,
          ),
          speechLang: result.speechLang || DEFAULT_LANGUAGE_CODE,
          forcedVoiceName: result.forcedVoiceName || "",
          elevenLabsKey: result.elevenLabsKey || "",
          elevenLabsVoiceId:
            result.elevenLabsVoiceId || DEFAULT_ELEVENLABS_VOICE_ID,
          useElevenLabs: Boolean(result.useElevenLabs),
          elevenLabsSavedKey: Boolean(result.elevenLabsKey),
        });
      },
    );
  }, [patch]);

  useEffect(() => {
    load();
    refreshGeminiUsage();

    if (!chromeApi?.storage?.onChanged) return;

    const handleStorageChange = (changes: any, areaName: string) => {
      if (areaName !== "local") return;

      if (changes[STORAGE_KEYS.speechRate]) {
        patch({
          speechRate: clampSpeechRate(
            changes[STORAGE_KEYS.speechRate].newValue ?? SPEECH_RATE_DEFAULT,
          ),
        });
      }
      if (changes[STORAGE_KEYS.speechLang]) {
        patch({
          speechLang:
            changes[STORAGE_KEYS.speechLang].newValue ?? DEFAULT_LANGUAGE_CODE,
        });
      }
      if (changes[STORAGE_KEYS.forcedVoiceName]) {
        patch({
          forcedVoiceName:
            changes[STORAGE_KEYS.forcedVoiceName].newValue ?? "",
        });
      }
      if (
        changes[STORAGE_KEYS.elevenLabsKey] ||
        changes[STORAGE_KEYS.elevenLabsVoiceId] ||
        changes[STORAGE_KEYS.useElevenLabs]
      ) {
        load();
      }
      if (
        changes[STORAGE_KEYS.geminiCallLog] ||
        changes[STORAGE_KEYS.geminiDailyLimit] ||
        changes[STORAGE_KEYS.aiRateLimitedUntil]
      ) {
        refreshGeminiUsage();
      }
    };

    chromeApi.storage.onChanged.addListener(handleStorageChange);
    const geminiUsageInterval = window.setInterval(refreshGeminiUsage, 5_000);

    return () => {
      chromeApi.storage.onChanged.removeListener(handleStorageChange);
      window.clearInterval(geminiUsageInterval);
    };
  }, [load, patch, refreshGeminiUsage]);

  return {
    settings,
    patch,
    geminiUsage,
    refreshGeminiUsage,
    saveToStorage,
    reloadSettings: load,
  };
}

export { SPEECH_RATE_MIN, SPEECH_RATE_MAX, SPEECH_RATE_STEP };
