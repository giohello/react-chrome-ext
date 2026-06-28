export const SPEECH_RATE_MIN = 0.5;
export const SPEECH_RATE_MAX = 2.5;
export const SPEECH_RATE_DEFAULT = 1;
export const SPEECH_RATE_STEP = 0.1;

export function clampSpeechRate(rate: number): number {
  return (
    Math.round(
      Math.min(SPEECH_RATE_MAX, Math.max(SPEECH_RATE_MIN, rate)) * 10,
    ) / 10
  );
}

export function formatSpeechRate(rate: number): string {
  return rate.toFixed(1);
}
