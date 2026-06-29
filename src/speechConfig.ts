export {
  SPEECH_RATE_MIN,
  SPEECH_RATE_MAX,
  SPEECH_RATE_DEFAULT,
  SPEECH_RATE_STEP,
} from "./constants";

export function clampSpeechRate(rate: number): number {
  return (
    Math.round(
      Math.min(2.5, Math.max(0.5, rate)) * 10,
    ) / 10
  );
}

export function formatSpeechRate(rate: number): string {
  return rate.toFixed(1);
}
