export type LanguageOption = {
  code: string; // BCP-47 tag, used for SpeechSynthesisUtterance.lang and voice matching
  label: string; // shown in the popup dropdown
  aiName: string; // name given to the AI model in the prompt, e.g. "Georgian"
};

export const LANGUAGES: LanguageOption[] = [
  { code: "en-US", label: "English", aiName: "English" },
  { code: "ka-GE", label: "Georgian (ქართული)", aiName: "Georgian" },
  { code: "ru-RU", label: "Russian (Русский)", aiName: "Russian" },
  { code: "es-ES", label: "Spanish (Español)", aiName: "Spanish" },
  { code: "fr-FR", label: "French (Français)", aiName: "French" },
  { code: "de-DE", label: "German (Deutsch)", aiName: "German" },
  { code: "tr-TR", label: "Turkish (Türkçe)", aiName: "Turkish" },
  { code: "ar-SA", label: "Arabic (العربية)", aiName: "Arabic" },
  { code: "zh-CN", label: "Chinese (中文)", aiName: "Chinese" },
  { code: "ja-JP", label: "Japanese (日本語)", aiName: "Japanese" },
];

export const DEFAULT_LANGUAGE_CODE = "en-US";

export function getLanguage(code: string): LanguageOption {
  return LANGUAGES.find((lang) => lang.code === code) ?? LANGUAGES[0];
}
