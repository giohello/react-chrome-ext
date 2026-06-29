/**
 * Shared constants used by both the popup (App.tsx) and the content script
 * (content.ts). Keep this file free of browser-API imports so it can be
 * bundled into both entry points without issues.
 */

export const SPEECH_RATE_MIN = 0.5;
export const SPEECH_RATE_MAX = 2.5;
export const SPEECH_RATE_DEFAULT = 1;
export const SPEECH_RATE_STEP = 0.1;

export const DEFAULT_ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // ElevenLabs "Rachel" premade voice
export const DEFAULT_GEMINI_DAILY_LIMIT = 20;
export const AI_DWELL_MS = 500;
export const AI_MIN_INTERVAL_MS = 4_000; // never fire more than one AI call this often
export const ELEVENLABS_DEBOUNCE_MS = 250;

export const STORAGE_KEYS = {
  aiEnabled: "aiEnabled",
  geminiKey: "geminiKey",
  speechRate: "speechRate",
  speechLang: "speechLang",
  forcedVoiceName: "forcedVoiceName",
  elevenLabsKey: "elevenLabsKey",
  elevenLabsVoiceId: "elevenLabsVoiceId",
  useElevenLabs: "useElevenLabs",
  uiLanguage: "uiLanguage",
  geminiCallLog: "geminiCallLog",
  geminiDailyLimit: "geminiDailyLimit",
  aiRateLimitedUntil: "aiRateLimitedUntil",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
