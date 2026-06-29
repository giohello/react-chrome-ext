/**
 * Content script – injected into every page.
 *
 * Architecture notes
 * ──────────────────
 * • Speech engine selection uses a simple Strategy pattern: `announce()`
 *   picks from three paths (exact local voice → ElevenLabs cloud → omnivorous
 *   fallback) without nesting them inside each other.
 * • Chrome message dispatch uses a Command map (Record<action, handler>)
 *   instead of a long if-chain, making it trivial to add or remove actions.
 * • Constants that are also used by the popup live in constants.ts; the ones
 *   below are private to the content script.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

type LanguageOption = {
  code: string;
  label: string;
  aiName: string;
};

type DescriptionData = {
  role: string;
  label?: string;
  alt?: string;
  type?: string;
  placeholder?: string;
  value?: string;
  link?: string;
  text?: string;
  tag: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────
// NOTE: these duplicate values from constants.ts intentionally — content
// scripts are bundled separately and cannot share modules with the popup at
// runtime. When changing these values, update constants.ts too.

const SPEECH_RATE_MIN = 0.5;
const SPEECH_RATE_MAX = 2.5;
const SPEECH_RATE_DEFAULT = 1;
const SPEECH_RATE_STEP = 0.1;
const DEFAULT_ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // ElevenLabs "Rachel"
const DEFAULT_GEMINI_DAILY_LIMIT = 20;
const AI_DWELL_MS = 500;
const AI_MIN_INTERVAL_MS = 4_000;
const ELEVENLABS_DEBOUNCE_MS = 250;

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "details",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

const LANGUAGES: LanguageOption[] = [
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
  // Not selectable in the popup, but recognized for script-based auto-detection.
  { code: "ko-KR", label: "Korean (한국어)", aiName: "Korean" },
  { code: "el-GR", label: "Greek (Ελληνικά)", aiName: "Greek" },
  { code: "he-IL", label: "Hebrew (עברית)", aiName: "Hebrew" },
  { code: "hi-IN", label: "Hindi (हिन्दी)", aiName: "Hindi" },
  { code: "th-TH", label: "Thai (ไทย)", aiName: "Thai" },
];

const DEFAULT_LANGUAGE_CODE = "en-US";

const ROLE_LABEL_MAP: Record<string, string> = {
  a: "link", button: "button", link: "link",
  textbox: "input field", input: "input field", textarea: "text area",
  select: "drop-down menu", checkbox: "checkbox", radio: "radio button",
  img: "image", image: "image",
  navigation: "navigation section", search: "search box",
  h1: "heading 1", h2: "heading 2", h3: "heading 3",
  h4: "heading 4", h5: "heading 5", h6: "heading 6",
  p: "paragraph", span: "text", div: "section",
  section: "section", article: "article", nav: "navigation",
  header: "header", footer: "footer", main: "main content", aside: "sidebar",
  ul: "list", ol: "numbered list", li: "list item",
  dl: "definition list", dt: "definition term", dd: "definition",
  table: "table", tr: "table row", td: "table cell", th: "table header cell",
  thead: "table header", tbody: "table body", tfoot: "table footer",
  form: "form", fieldset: "field group", legend: "label", label: "label",
  audio: "audio player", video: "video player", canvas: "canvas",
  svg: "graphic", blockquote: "quote", code: "code", pre: "code block",
  strong: "emphasized text", em: "emphasized text",
  b: "bold text", i: "italic text",
};

// ─── Mutable state ───────────────────────────────────────────────────────────

const chrome = (window as any).chrome;
let isEnabled = false;
let currentTarget: Element | null = null;
let focusIndex = -1;
let aiEnabled = false;
let geminiKey = "";
let speechRate = SPEECH_RATE_DEFAULT;
let speechLang = DEFAULT_LANGUAGE_CODE;
let forcedVoiceName = "";
let hoverTimer: number | null = null;
let hoverToken = 0;
let aiRateLimitedUntil = 0;
let rateLimitNoticeActive = false;
let lastAiCallAt = 0;
let elevenLabsKey = "";
let elevenLabsVoiceId = DEFAULT_ELEVENLABS_VOICE_ID;
let useElevenLabs = false;
let geminiDailyLimit = DEFAULT_GEMINI_DAILY_LIMIT;
let currentCloudAudio: HTMLAudioElement | null = null;
let elevenLabsAbortController: AbortController | null = null;
let elevenLabsDebounceTimer: number | null = null;
let pendingSpeakTimer: number | null = null;
// Bumped on every announce() call and on stopSpeech()/disable(). Async
// continuations capture this generation and bail if it's been superseded.
let speechGeneration = 0;
let elevenLabsBlockedReason: string | null = null;
let voiceMissingWarnedFor: string | null = null;

// ─── DOM overlays (created once, reused) ─────────────────────────────────────

const highlight = createHighlightOverlay();
const infoPanel = createInfoPanel();
const liveRegion = createLiveRegion();
const lastAnnounce = { text: "", timeout: 0 };

// ─── Language helpers ─────────────────────────────────────────────────────────

function getLanguage(code: string): LanguageOption {
  return LANGUAGES.find((lang) => lang.code === code) ?? LANGUAGES[0];
}

/**
 * Detects the *script* the text is written in and returns the matching BCP-47
 * code. Latin-script languages can't be told apart by script alone and all
 * fall back to the default voice; only non-Latin scripts get a specific match.
 */
function detectScriptLanguage(text: string): string {
  const scriptRanges: { code: string; test: RegExp }[] = [
    { code: "ka-GE", test: /[\u10A0-\u10FF\u1C90-\u1CBF]/ },
    { code: "ru-RU", test: /[\u0400-\u04FF]/ },
    { code: "ar-SA", test: /[\u0600-\u06FF\u0750-\u077F]/ },
    { code: "zh-CN", test: /[\u4E00-\u9FFF]/ },
    { code: "ja-JP", test: /[\u3040-\u30FF]/ },
    { code: "ko-KR", test: /[\uAC00-\uD7A3]/ },
    { code: "el-GR", test: /[\u0370-\u03FF]/ },
    { code: "he-IL", test: /[\u0590-\u05FF]/ },
    { code: "hi-IN", test: /[\u0900-\u097F]/ },
    { code: "th-TH", test: /[\u0E00-\u0E7F]/ },
  ];

  for (const { code, test } of scriptRanges) {
    if (test.test(text)) return code;
  }
  return DEFAULT_LANGUAGE_CODE;
}

// ─── DOM overlay factories ───────────────────────────────────────────────────

function createHighlightOverlay(): HTMLDivElement {
  const overlay = document.createElement("div");
  overlay.style.cssText = [
    "position:fixed",
    "pointer-events:none",
    "z-index:2147483647",
    "border:3px solid rgba(255, 166, 0, 0.95)",
    "border-radius:8px",
    "box-shadow:0 0 0 4px rgba(255, 166, 0, 0.25)",
    "transition:all 120ms ease-out",
    "display:none",
  ].join(";");
  document.documentElement.appendChild(overlay);
  return overlay;
}

function createInfoPanel(): HTMLDivElement {
  const panel = document.createElement("div");
  panel.style.cssText = [
    "position:fixed",
    "bottom:16px",
    "right:16px",
    "max-width:380px",
    "padding:14px 16px",
    "background:rgba(15,15,15,0.92)",
    "color:white",
    "font:14px system-ui, sans-serif",
    "line-height:1.4",
    "border-radius:14px",
    "box-shadow:0 18px 44px rgba(0,0,0,0.25)",
    "pointer-events:none",
    "z-index:2147483647",
    "display:none",
    "white-space:pre-wrap",
  ].join(";");
  panel.textContent = "Blind Helper is ready. Enable the extension from the popup.";
  document.documentElement.appendChild(panel);
  return panel;
}

function createLiveRegion(): HTMLDivElement {
  const region = document.createElement("div");
  region.setAttribute("aria-live", "polite");
  region.setAttribute("aria-atomic", "true");
  region.style.cssText = [
    "position:absolute",
    "width:1px",
    "height:1px",
    "margin:-1px",
    "border:0",
    "padding:0",
    "overflow:hidden",
    "clip:rect(0 0 0 0)",
    "clip-path: inset(50%)",
    "white-space:nowrap",
  ].join(";");
  document.documentElement.appendChild(region);
  return region;
}

// ─── Element description ─────────────────────────────────────────────────────

function describeElement(element: Element | null): string {
  if (!element) {
    return JSON.stringify({ role: "unknown", tag: "unknown" });
  }

  const tag = element.tagName.toLowerCase();
  const role = element.getAttribute("role") || tag;
  const label =
    element.getAttribute("aria-label") ||
    getTextFromLabelledBy(element) ||
    (element as HTMLElement).getAttribute("title") ||
    "";
  const alt = (element as HTMLImageElement).alt?.trim() || "";
  const value =
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
      ? String(element.value ?? "").trim()
      : "";
  const placeholder = (element as HTMLInputElement).placeholder?.trim() || "";
  const text = getRenderedText(element);
  const fallbackText =
    text ||
    getTextFromNearestTextContainer(element) ||
    getTextFromNearbyElement(element);
  const href = element instanceof HTMLAnchorElement ? element.href : "";
  const type = element instanceof HTMLInputElement ? element.type : "";

  const data: DescriptionData = {
    role, tag,
    label: label || undefined,
    alt: alt || undefined,
    type: type || undefined,
    placeholder: placeholder || undefined,
    value: value || undefined,
    link: href || undefined,
    text: fallbackText || undefined,
  };

  return JSON.stringify(data);
}

function getTextFromLabelledBy(element: Element): string {
  const labelledBy = element.getAttribute("aria-labelledby");
  if (!labelledBy) return "";
  return labelledBy
    .split(" ")
    .map((id) => document.getElementById(id)?.textContent?.trim() || "")
    .filter(Boolean)
    .join(" ");
}

function getTextFromNearbyElement(element: Element): string {
  if (!(element instanceof HTMLElement)) return "";

  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return "";

  const points = [
    { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    { x: rect.left + 1, y: rect.top + 1 },
    { x: rect.right - 1, y: rect.top + 1 },
    { x: rect.left + 1, y: rect.bottom - 1 },
    { x: rect.right - 1, y: rect.bottom - 1 },
  ];

  for (const point of points) {
    for (const candidate of document.elementsFromPoint(point.x, point.y)) {
      if (candidate === element) continue;
      if (!(candidate instanceof HTMLElement)) continue;
      if (!isVisible(candidate)) continue;
      const text = candidate.textContent?.trim() || "";
      if (text.length > 1) return text;
    }
  }
  return "";
}

function getTextFromNearestTextContainer(element: Element): string {
  if (!(element instanceof HTMLElement)) return "";
  let current: HTMLElement | null = element;
  while (current) {
    const text = current.textContent?.trim() || "";
    if (text.length > 1) return text;
    current = current.parentElement;
  }
  return "";
}

function getRenderedText(element: Element): string {
  if (!(element instanceof HTMLElement)) return "";
  const text = element.innerText?.trim() || "";
  return text.length > 1 ? text : (element.textContent?.trim() || "");
}

function getFriendlyDescription(rawDescription: string): string {
  let fields: Record<string, string> = {};

  try {
    const parsed = JSON.parse(rawDescription) as DescriptionData;
    fields = Object.entries(parsed).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        if (typeof value === "string" && value.trim()) {
          acc[key] = value.trim();
        }
        return acc;
      },
      {},
    );
  } catch {
    fields = rawDescription
      .split(", ")
      .reduce<Record<string, string>>((acc, part, index) => {
        const [key, ...rest] = part.split(": ");
        if (rest.length > 0) {
          acc[key.trim()] = rest.join(": ").trim();
        } else if (index === 0) {
          acc.role = key.trim();
        }
        return acc;
      }, {});
  }

  const { role = "item", label, alt, placeholder, value, link: href, text } = fields;
  const pieces: string[] = [];

  pieces.push(ROLE_LABEL_MAP[role.toLowerCase()] || "page item");

  if (label) {
    pieces.push(`labeled ${label}`);
  } else if (alt) {
    pieces.push(`showing ${alt}`);
  } else if (text) {
    pieces.push(text);
  } else if (placeholder) {
    pieces.push(`with placeholder ${placeholder}`);
  }

  if (href && (role === "link" || role === "a" || role === "A")) {
    pieces.push(`link to ${href}`);
  }
  if (value && !label && !text && role.includes("input")) {
    pieces.push(`currently ${value}`);
  }

  return pieces.join(" ").replace(/\s+/g, " ").trim() || rawDescription;
}

// ─── Visual / image helpers ──────────────────────────────────────────────────

function getBackgroundImageUrl(element: Element): string | null {
  const bg = window.getComputedStyle(element).backgroundImage;
  if (!bg || bg === "none") return null;
  const match = bg.match(/url\(["']?(.*?)["']?\)/);
  return match ? match[1] : null;
}

function isVisualElement(element: Element): boolean {
  if (!element) return false;
  const tag = element.tagName.toLowerCase();
  if (["img", "canvas", "svg", "video"].includes(tag)) return true;
  return Boolean(getBackgroundImageUrl(element));
}

async function getBase64FromUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return blobToBase64(blob);
  } catch (err) {
    console.error(
      "Failed to fetch visual asset (likely a CORS restriction):",
      err,
    );
    updateInfo(
      "Couldn't analyze this image (blocked by the site's CORS policy). Using text description instead.",
    );
    return null;
  }
}

function serializeSvg(element: SVGElement): string | null {
  try {
    return new XMLSerializer().serializeToString(element);
  } catch (err) {
    console.error("SVG serialization failed:", err);
    return null;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─── Gemini rate-limit / quota tracking ──────────────────────────────────────

function extractQuotaValue(errorBody: string): number | null {
  try {
    const details = JSON.parse(errorBody)?.error?.details;
    if (!Array.isArray(details)) return null;
    const violation = details
      .find((d: any) => String(d["@type"] || "").includes("QuotaFailure"))
      ?.violations?.[0]?.quotaValue;
    const n = parseInt(violation, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function extractRetryDelayMs(errorBody: string): number | null {
  try {
    const details = JSON.parse(errorBody)?.error?.details;
    if (!Array.isArray(details)) return null;
    const delay = details.find((d: any) =>
      String(d["@type"] || "").includes("RetryInfo"),
    )?.retryDelay; // e.g. "21s"
    if (typeof delay !== "string") return null;
    const seconds = parseFloat(delay.replace("s", ""));
    return Number.isFinite(seconds) ? Math.ceil(seconds * 1000) : null;
  } catch {
    return null;
  }
}

/**
 * Gemini's API doesn't expose remaining quota, so we track our own call
 * history locally and estimate against the last known daily limit.
 */
function recordGeminiCall(): void {
  if (!chrome?.storage?.local) return;
  chrome.storage.local.get(["geminiCallLog"], (result: any) => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const log: number[] = Array.isArray(result.geminiCallLog)
      ? result.geminiCallLog
      : [];
    const pruned = [...log.filter((t) => t > oneDayAgo), now];
    chrome.storage.local.set({ geminiCallLog: pruned });
  });
}

function persistRateLimitState(): void {
  if (!chrome?.storage?.local) return;
  chrome.storage.local.set({ aiRateLimitedUntil, geminiDailyLimit });
}

// ─── Gemini vision ───────────────────────────────────────────────────────────

async function analyzeVisualElementWithVision(
  element: Element,
  rawDescription: string,
): Promise<string> {
  if (!aiEnabled || !geminiKey || !isVisualElement(element)) {
    return rawDescription;
  }
  if (Date.now() < aiRateLimitedUntil) {
    return rawDescription;
  }
  if (Date.now() - lastAiCallAt < AI_MIN_INTERVAL_MS) {
    return rawDescription;
  }

  lastAiCallAt = Date.now();
  recordGeminiCall();

  try {
    const { imageData, mediaType } = await extractImageData(element);
    if (!imageData) return rawDescription;

    const lang = getLanguage(speechLang).aiName;
    const payload = {
      contents: [
        {
          parts: [
            {
              text: `Describe this visual content in one or two sentences, in ${lang}. Be concise and focus on what is visible. Respond only in ${lang}, with no English unless that is the element's actual text.`,
            },
            { inline_data: { mime_type: mediaType, data: imageData } },
          ],
        },
      ],
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      console.error("[Vision] API error:", response.status, body);
      handleGeminiError(response.status, body);
      return rawDescription;
    }

    const data = await response.json();
    const resultText = (data.candidates?.[0]?.content?.parts ?? [])
      .map((part: any) => part.text || "")
      .join("")
      .trim();

    return resultText || rawDescription;
  } catch (err) {
    console.error("Vision analysis error:", err);
    return rawDescription;
  }
}

async function extractImageData(
  element: Element,
): Promise<{ imageData: string | null; mediaType: string }> {
  let imageData: string | null = null;
  let mediaType = "image/jpeg";
  const tag = element.tagName.toLowerCase();

  if (tag === "img") {
    const src = (element as HTMLImageElement).currentSrc || (element as HTMLImageElement).src;
    if (src) imageData = await getBase64FromUrl(src);
  } else if (tag === "canvas") {
    imageData = (element as HTMLCanvasElement).toDataURL("image/png");
    mediaType = "image/png";
  } else if (tag === "svg") {
    const svgString = serializeSvg(element as SVGElement);
    if (svgString) {
      imageData = `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(svgString)))}`;
      mediaType = "image/svg+xml";
    }
  } else if (tag === "video") {
    const poster = (element as HTMLVideoElement).poster;
    if (poster) imageData = await getBase64FromUrl(poster);
  }

  if (!imageData) {
    const bgUrl = getBackgroundImageUrl(element);
    if (bgUrl) {
      const base64 = await getBase64FromUrl(bgUrl);
      if (base64) { imageData = base64; mediaType = "image/png"; }
    }
  }

  // Strip the data: URL prefix — Gemini wants raw base64
  if (imageData?.startsWith("data:")) {
    const [meta, data] = imageData.split(",");
    if (data) {
      mediaType = meta.split(";")[0].replace("data:", "") || mediaType;
      imageData = data;
    }
  }

  return { imageData, mediaType };
}

function handleGeminiError(status: number, body: string): void {
  if (status === 429) {
    const retryMs = extractRetryDelayMs(body) ?? 30_000;
    aiRateLimitedUntil = Date.now() + retryMs;
    const reportedLimit = extractQuotaValue(body);
    if (reportedLimit) geminiDailyLimit = reportedLimit;
    persistRateLimitState();

    if (!rateLimitNoticeActive) {
      rateLimitNoticeActive = true;
      const seconds = Math.ceil(retryMs / 1000);
      const notice = `AI image descriptions paused: Gemini's free daily quota is used up. Using basic descriptions for about ${seconds} seconds, or until tomorrow if the quota resets daily.`;
      updateInfo(notice);
      announce(notice);
      window.setTimeout(() => {
        rateLimitNoticeActive = false;
        persistRateLimitState();
      }, retryMs);
    }
  } else {
    updateInfo(`Vision failed (${status}). Check console.`);
  }
}

// ─── Speech ──────────────────────────────────────────────────────────────────

function updateInfo(text: string): void {
  infoPanel.textContent = text;
  liveRegion.textContent = text;
}

function stopSpeech(): void {
  window.speechSynthesis?.cancel();
  currentCloudAudio?.pause();
  currentCloudAudio = null;
  elevenLabsAbortController?.abort();
  elevenLabsAbortController = null;
  if (elevenLabsDebounceTimer) {
    window.clearTimeout(elevenLabsDebounceTimer);
    elevenLabsDebounceTimer = null;
  }
  speechGeneration++; // invalidate any pending async speech
  if (pendingSpeakTimer) {
    window.clearTimeout(pendingSpeakTimer);
    pendingSpeakTimer = null;
  }
  if (lastAnnounce.timeout) {
    window.clearTimeout(lastAnnounce.timeout);
    lastAnnounce.timeout = 0;
  }
}

/** Returns a voice that actually claims to support `lang`, or undefined. */
function pickExactVoiceForLanguage(lang: string): SpeechSynthesisVoice | undefined {
  if (!("speechSynthesis" in window)) return undefined;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return undefined;
  const exact = voices.find((v) => v.lang === lang);
  if (exact) return exact;
  const base = lang.split("-")[0];
  return voices.find((v) => v.lang.toLowerCase().startsWith(base.toLowerCase()));
}

/** Last-resort: Google's multilingual network voices attempt any script. */
function pickOmnivorousFallbackVoice(): SpeechSynthesisVoice | undefined {
  if (!("speechSynthesis" in window)) return undefined;
  return window.speechSynthesis.getVoices().find((v) => v.name.includes("Google"));
}

async function speakWithElevenLabs(text: string): Promise<boolean> {
  if (!elevenLabsKey || !elevenLabsVoiceId || elevenLabsBlockedReason) {
    return false;
  }

  // Cancel any previous in-flight request to avoid concurrency limit hits
  elevenLabsAbortController?.abort();
  const controller = new AbortController();
  elevenLabsAbortController = controller;

  currentCloudAudio?.pause();
  currentCloudAudio = null;

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenLabsKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }),
        signal: controller.signal,
      },
    );

    if (controller.signal.aborted || !isEnabled) return false;

    if (!response.ok) {
      const body = await response.text();
      console.error("[ElevenLabs] API error:", response.status, body);
      handleElevenLabsError(response.status);
      return false;
    }

    const blob = await response.blob();
    if (controller.signal.aborted || !isEnabled) return false;

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentCloudAudio = audio;
    audio.onended = () => {
      URL.revokeObjectURL(url);
      if (currentCloudAudio === audio) currentCloudAudio = null;
    };
    await audio.play();
    return true;
  } catch (err) {
    if ((err as any)?.name === "AbortError") return false;
    console.error("[ElevenLabs] request failed:", err);
    return false;
  }
}

function handleElevenLabsError(status: number): void {
  if (status === 401 || status === 402) {
    elevenLabsBlockedReason = `ElevenLabs voice unavailable (${status}). This voice ID isn't usable on your current plan via the API — pick a different voice from "My Voices" in the popup, or add one from the Voice Library to your account first.`;
    updateInfo(elevenLabsBlockedReason);
    announce(elevenLabsBlockedReason);
  } else if (status === 429) {
    updateInfo("ElevenLabs is rate-limited (429). Falling back to local voice for now.");
  } else {
    updateInfo(`ElevenLabs voice failed (${status}). Falling back to local voice.`);
  }
}

/**
 * Speaks `text` using the best available engine.
 *
 * Strategy (in priority order):
 *  1. Exact local voice for the detected language (free, instant, preferred)
 *  2. ElevenLabs cloud TTS (when no real local voice exists and configured)
 *  3. Omnivorous Google network voice (last resort)
 */
function announce(text: string, rate = speechRate): void {
  if (!isEnabled) return;

  updateInfo(text);

  // Cancel everything currently playing before deciding what's next
  stopSpeech();

  const myGeneration = speechGeneration; // captured *after* stopSpeech increments it
  const detectedLang = detectScriptLanguage(text);
  const forcedVoice = forcedVoiceName
    ? window.speechSynthesis?.getVoices().find((v) => v.name === forcedVoiceName)
    : undefined;
  const exactLocalVoice = forcedVoice ?? pickExactVoiceForLanguage(detectedLang);
  const hasRealLocalVoice = Boolean(exactLocalVoice);

  const speakLocally = (
    voice: SpeechSynthesisVoice | undefined,
    warnIfMissing: boolean,
  ): void => {
    if (!("speechSynthesis" in window)) return;

    const speakNow = () => {
      pendingSpeakTimer = null;
      if (myGeneration !== speechGeneration || !isEnabled) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.lang = detectedLang;
      if (voice) {
        utterance.voice = voice;
      } else if (warnIfMissing && detectedLang !== DEFAULT_LANGUAGE_CODE) {
        if (voiceMissingWarnedFor !== detectedLang) {
          voiceMissingWarnedFor = detectedLang;
          const langName = getLanguage(detectedLang).aiName;
          updateInfo(
            `Note: no ${langName} voice is installed on this device. Attempting to speak detected ${langName} text anyway — install a ${langName} system voice, pick a Narrator voice override, or enable ElevenLabs cloud voice in the popup, if you hear nothing.`,
          );
        }
      }

      utterance.onerror = (event) => {
        if (event.error === "interrupted" || event.error === "canceled") return;
        console.error("[Speech] utterance error:", event.error, "lang:", detectedLang);
      };

      window.speechSynthesis.speak(utterance);
    };

    // Chrome bug: speak() immediately after cancel() can silently drop the utterance.
    if (pendingSpeakTimer) window.clearTimeout(pendingSpeakTimer);
    pendingSpeakTimer = window.setTimeout(speakNow, 30);
  };

  if (hasRealLocalVoice) {
    // Strategy 1: real local voice — free and instant
    speakLocally(exactLocalVoice, false);
  } else if (useElevenLabs && elevenLabsKey) {
    // Strategy 2: ElevenLabs cloud — debounced to avoid concurrency hammering
    elevenLabsDebounceTimer = window.setTimeout(() => {
      elevenLabsDebounceTimer = null;
      if (myGeneration !== speechGeneration || !isEnabled) return;
      speakWithElevenLabs(text).then((succeeded) => {
        if (!succeeded && isEnabled && myGeneration === speechGeneration) {
          speakLocally(pickOmnivorousFallbackVoice(), true);
        }
      });
    }, ELEVENLABS_DEBOUNCE_MS);
  } else {
    // Strategy 3: omnivorous fallback
    speakLocally(pickOmnivorousFallbackVoice(), true);
  }

  // Clear the info panel after a short while to avoid stale text
  if (lastAnnounce.timeout) window.clearTimeout(lastAnnounce.timeout);
  lastAnnounce.timeout = window.setTimeout(() => {
    if (infoPanel.textContent === text) updateInfo("Blind Helper is ready.");
  }, 7_000);
}

// ─── Highlight ───────────────────────────────────────────────────────────────

function setHighlight(element: Element | null): void {
  if (!element) {
    highlight.style.display = "none";
    return;
  }
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    highlight.style.display = "none";
    return;
  }
  Object.assign(highlight.style, {
    display: "block",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });
}

function refreshHighlight(): void {
  if (currentTarget && isEnabled) setHighlight(currentTarget);
}

// ─── DOM helpers ─────────────────────────────────────────────────────────────

function isVisible(element: HTMLElement): boolean {
  if (!element.offsetParent && element !== document.body) return false;
  const style = window.getComputedStyle(element);
  return style.visibility !== "hidden" && style.display !== "none";
}

function collectFocusableElements(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((el) => isVisible(el) && !el.hasAttribute("disabled"));
}

// ─── Speech rate ─────────────────────────────────────────────────────────────

function clampSpeechRate(rate: number): number {
  return Math.round(Math.min(SPEECH_RATE_MAX, Math.max(SPEECH_RATE_MIN, rate)) * 10) / 10;
}

function formatSpeechRate(rate: number): string {
  return rate.toFixed(1);
}

function applySpeechRate(rate: number, announceChange = false): void {
  speechRate = clampSpeechRate(rate);
  if (announceChange) announce(`Speech speed ${formatSpeechRate(speechRate)}`, speechRate);
}

function saveSpeechRate(rate: number): void {
  chrome?.storage?.local?.set({ speechRate: rate });
}

function adjustSpeechRate(delta: number): void {
  applySpeechRate(speechRate + delta, true);
  saveSpeechRate(speechRate);
}

// ─── State ───────────────────────────────────────────────────────────────────

function updateState(enabled: boolean): void {
  isEnabled = enabled;
  if (isEnabled) {
    updateInfo("Blind Helper is active. Hover elements or press Tab to navigate.");
  } else {
    stopSpeech();
    currentTarget = null;
    setHighlight(null);
    updateInfo("Blind Helper is disabled. Open the popup to enable it.");
  }
}

function describeAndAnnounce(element: Element | null): void {
  if (!element) return;

  if (hoverTimer) {
    window.clearTimeout(hoverTimer);
    hoverTimer = null;
  }

  const rawDescription = describeElement(element);
  const friendly = getFriendlyDescription(rawDescription);
  setHighlight(element);
  announce(friendly);

  if (!aiEnabled || !isVisualElement(element)) return;

  const myToken = ++hoverToken;
  hoverTimer = window.setTimeout(async () => {
    const aiDescription = await analyzeVisualElementWithVision(element, friendly);
    if (myToken !== hoverToken || !isEnabled || currentTarget !== element) return;
    setHighlight(element);
    announce(aiDescription);
  }, AI_DWELL_MS);
}

// ─── Settings loader ─────────────────────────────────────────────────────────

function loadSettings(): void {
  if (!chrome?.storage?.local?.get) return;

  chrome.storage.local.get(
    [
      "aiEnabled", "geminiKey", "speechRate", "speechLang",
      "forcedVoiceName", "elevenLabsKey", "elevenLabsVoiceId",
      "useElevenLabs", "geminiDailyLimit",
    ],
    (result: any) => {
      aiEnabled = Boolean(result.aiEnabled);
      geminiKey = result.geminiKey || "";
      speechLang = result.speechLang || DEFAULT_LANGUAGE_CODE;
      forcedVoiceName = result.forcedVoiceName || "";
      elevenLabsKey = result.elevenLabsKey || "";
      elevenLabsVoiceId = result.elevenLabsVoiceId || elevenLabsVoiceId;
      useElevenLabs = Boolean(result.useElevenLabs);
      geminiDailyLimit =
        typeof result.geminiDailyLimit === "number"
          ? result.geminiDailyLimit
          : DEFAULT_GEMINI_DAILY_LIMIT;
      voiceMissingWarnedFor = null;
      applySpeechRate(
        typeof result.speechRate === "number" ? result.speechRate : SPEECH_RATE_DEFAULT,
      );
      if (geminiKey) checkAvailableModels();
    },
  );
}

async function checkAvailableModels(): Promise<void> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(geminiKey)}`,
    );
    if (!response.ok) {
      console.error("[Debug] Failed to list models:", response.status);
      return;
    }
    const data = await response.json();
    const models = (data.models || [])
      .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m: any) => m.name);
    console.log("[Debug] Available vision models:", models);
  } catch (err) {
    console.error("[Debug] Error checking models:", err);
  }
}

// ─── Event handlers ──────────────────────────────────────────────────────────

function handleMouseMove(event: MouseEvent): void {
  if (!isEnabled) return;
  const target = event.target as Element | null;
  if (!target || target === currentTarget || target === highlight || target === infoPanel || target === liveRegion) {
    return;
  }
  currentTarget = target;
  describeAndAnnounce(target);
}

function handleKeyDown(event: KeyboardEvent): void {
  if (!isEnabled) return;

  if (event.altKey && event.shiftKey && event.key === "ArrowUp") {
    event.preventDefault();
    event.stopPropagation();
    adjustSpeechRate(SPEECH_RATE_STEP);
    return;
  }

  if (event.altKey && event.shiftKey && event.key === "ArrowDown") {
    event.preventDefault();
    event.stopPropagation();
    adjustSpeechRate(-SPEECH_RATE_STEP);
    return;
  }

  if (event.key === "Tab") {
    event.preventDefault();
    event.stopPropagation();

    const focusables = collectFocusableElements();
    if (focusables.length === 0) {
      announce("No focusable elements were detected on this page.");
      return;
    }

    const current = document.activeElement as HTMLElement | null;
    const currentIndex = focusables.indexOf(current ?? (document.body as HTMLElement));
    const direction = event.shiftKey ? -1 : 1;
    focusIndex = currentIndex >= 0 ? currentIndex + direction : 0;
    if (focusIndex < 0) focusIndex = focusables.length - 1;
    focusIndex = focusIndex % focusables.length;

    const next = focusables[focusIndex];
    next.focus();
    describeAndAnnounce(next);
  }
}

// ─── Message dispatch (Command map pattern) ───────────────────────────────────

type MessageHandler = (message: any, sendResponse: (r: any) => void) => void;

const MESSAGE_HANDLERS: Record<string, MessageHandler> = {
  setEnabled(message, sendResponse) {
    updateState(Boolean(message.enabled));
    sendResponse({ enabled: isEnabled });
  },

  setAiConfig(message, sendResponse) {
    aiEnabled = Boolean(message.aiEnabled);
    geminiKey = message.geminiKey || "";
    sendResponse({ ok: true });
  },

  setSpeechRate(message, sendResponse) {
    applySpeechRate(Number(message.speechRate));
    sendResponse({ speechRate });
  },

  setLanguage(message, sendResponse) {
    speechLang = message.speechLang || DEFAULT_LANGUAGE_CODE;
    voiceMissingWarnedFor = null;
    sendResponse({ speechLang });
  },

  setForcedVoice(message, sendResponse) {
    forcedVoiceName = message.forcedVoiceName || "";
    sendResponse({ forcedVoiceName });
  },

  setElevenLabsConfig(message, sendResponse) {
    elevenLabsKey = message.elevenLabsKey ?? elevenLabsKey;
    elevenLabsVoiceId = message.elevenLabsVoiceId ?? elevenLabsVoiceId;
    useElevenLabs = Boolean(message.useElevenLabs);
    elevenLabsBlockedReason = null; // reset on config change
    sendResponse({ elevenLabsKey: !!elevenLabsKey, elevenLabsVoiceId, useElevenLabs });
  },

  queryState(_message, sendResponse) {
    sendResponse({ enabled: isEnabled, speechRate, speechLang, forcedVoiceName, useElevenLabs });
  },

  announceHover(_message, sendResponse) {
    if (currentTarget) {
      describeAndAnnounce(currentTarget);
      sendResponse({ ok: true });
    } else {
      announce("No hovered item detected yet.");
      sendResponse({ ok: false });
    }
  },

  announceFocus(_message, sendResponse) {
    const target = document.activeElement instanceof Element ? document.activeElement : null;
    if (target) {
      describeAndAnnounce(target);
      sendResponse({ ok: true });
    } else {
      announce("No focused item detected.");
      sendResponse({ ok: false });
    }
  },
};

function handleMessage(message: any, _sender: any, sendResponse: any): void {
  if (!message || typeof message !== "object") return;
  const handler = MESSAGE_HANDLERS[message.action];
  handler?.(message, sendResponse);
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(handleMessage);

if (chrome?.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes: any, areaName: string) => {
    if (areaName !== "local" || !changes.speechRate) return;
    applySpeechRate(changes.speechRate.newValue ?? SPEECH_RATE_DEFAULT);
  });
}

window.addEventListener("mousemove", handleMouseMove, true);
window.addEventListener("keydown", handleKeyDown, true);
window.addEventListener("scroll", refreshHighlight, true);
window.addEventListener("resize", refreshHighlight);

loadSettings();
updateState(false);
