type LanguageOption = {
  code: string;
  label: string;
  aiName: string;
};

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
  // Not selectable in the popup, but recognized so speech-language
  // auto-detection can name them correctly in notices.
  { code: "ko-KR", label: "Korean (한국어)", aiName: "Korean" },
  { code: "el-GR", label: "Greek (Ελληνικά)", aiName: "Greek" },
  { code: "he-IL", label: "Hebrew (עברית)", aiName: "Hebrew" },
  { code: "hi-IN", label: "Hindi (हिन्दी)", aiName: "Hindi" },
  { code: "th-TH", label: "Thai (ไทย)", aiName: "Thai" },
];

const DEFAULT_LANGUAGE_CODE = "en-US";

function getLanguage(code: string): LanguageOption {
  return LANGUAGES.find((lang) => lang.code === code) ?? LANGUAGES[0];
}

// Detects which language to *speak* text in by looking at the actual
// Unicode script the text is written in, rather than trusting a
// configured setting. This matters because the text being spoken (DOM
// content, or an AI description) isn't necessarily in whatever language
// the popup's "AI description language" picker is set to — that picker
// only controls what language Gemini is asked to write descriptions in.
// Latin-script languages (English, German, Spanish, Turkish, etc.) can't
// be reliably told apart by script alone, so they all fall back to the
// default voice — only non-Latin scripts get a confident, specific match.
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
    if (test.test(text)) {
      return code;
    }
  }

  return DEFAULT_LANGUAGE_CODE;
}

const chrome = (window as any).chrome;
let isEnabled = false;
let currentTarget: Element | null = null;
let focusIndex = -1;
let aiEnabled = false;
let geminiKey = "";
const SPEECH_RATE_MIN = 0.5;
const SPEECH_RATE_MAX = 2.5;
const SPEECH_RATE_DEFAULT = 1;
const SPEECH_RATE_STEP = 0.1;
let speechRate = SPEECH_RATE_DEFAULT;
let speechLang = DEFAULT_LANGUAGE_CODE;
let forcedVoiceName: string = "";
let hoverTimer: number | null = null;
let hoverToken = 0;
const AI_DWELL_MS = 500;
let aiRateLimitedUntil = 0;
let rateLimitNoticeActive = false;
let lastAiCallAt = 0;
const AI_MIN_INTERVAL_MS = 4000; // never fire more than one AI call this often
let elevenLabsKey = "";
let elevenLabsVoiceId = "21m00Tcm4TlvDq8ikWAM"; // ElevenLabs' default "Rachel" premade voice
let useElevenLabs = false;
let geminiDailyLimit = 20; // updated automatically if Gemini reports a different limit
let currentCloudAudio: HTMLAudioElement | null = null;
let elevenLabsAbortController: AbortController | null = null;
let elevenLabsDebounceTimer: number | null = null;
const ELEVENLABS_DEBOUNCE_MS = 250;
let pendingSpeakTimer: number | null = null;
// Bumped on every new announce() call (and on stopSpeech/disable). Async
// continuations — the cloud TTS fallback, the delayed local-speak timer —
// capture the generation they belong to and check it before actually
// producing audio, so a slow/failed call that's been superseded by a
// newer hover never gets to speak after the fact.
let speechGeneration = 0;

function clampSpeechRate(rate: number) {
  return (
    Math.round(
      Math.min(SPEECH_RATE_MAX, Math.max(SPEECH_RATE_MIN, rate)) * 10,
    ) / 10
  );
}

function formatSpeechRate(rate: number) {
  return rate.toFixed(1);
}

const highlight = createHighlightOverlay();
const infoPanel = createInfoPanel();
const liveRegion = createLiveRegion();
const lastAnnounce = { text: "", timeout: 0 };

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "details",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

function createHighlightOverlay() {
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

function createInfoPanel() {
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
  panel.textContent =
    "Blind Helper is ready. Enable the extension from the popup.";
  document.documentElement.appendChild(panel);
  return panel;
}

function createLiveRegion() {
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

function describeElement(element: Element | null) {
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
    role,
    tag,
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

function getTextFromLabelledBy(element: Element) {
  const labelledBy = element.getAttribute("aria-labelledby");
  if (!labelledBy) {
    return "";
  }
  return Array.from(labelledBy.split(" "))
    .map((id) => document.getElementById(id)?.textContent?.trim() || "")
    .filter(Boolean)
    .join(" ");
}

function getTextFromNearbyElement(element: Element): string {
  if (!(element instanceof HTMLElement)) {
    return "";
  }

  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return "";
  }

  const points = [
    { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    { x: rect.left + 1, y: rect.top + 1 },
    { x: rect.right - 1, y: rect.top + 1 },
    { x: rect.left + 1, y: rect.bottom - 1 },
    { x: rect.right - 1, y: rect.bottom - 1 },
  ];

  for (const point of points) {
    const elements = document.elementsFromPoint(point.x, point.y);
    for (const candidate of elements) {
      if (candidate === element) {
        continue;
      }
      if (!(candidate instanceof HTMLElement)) {
        continue;
      }
      if (!isVisible(candidate)) {
        continue;
      }
      const candidateText = candidate.textContent?.trim() || "";
      if (candidateText.length > 1) {
        return candidateText;
      }
    }
  }

  return "";
}

function getTextFromNearestTextContainer(element: Element): string {
  if (!(element instanceof HTMLElement)) {
    return "";
  }

  let current: HTMLElement | null = element;
  while (current) {
    const text = current.textContent?.trim() || "";
    if (text.length > 1) {
      return text;
    }
    current = current.parentElement;
  }

  return "";
}

function getRenderedText(element: Element): string {
  if (!(element instanceof HTMLElement)) {
    return "";
  }

  const text = element.innerText?.trim() || "";
  if (text.length > 1) {
    return text;
  }

  return element.textContent?.trim() || "";
}

function getFriendlyDescription(rawDescription: string) {
  let fields: Record<string, string> = {};

  try {
    const parsed = JSON.parse(rawDescription) as DescriptionData;
    fields = Object.keys(parsed).reduce<Record<string, string>>((acc, key) => {
      const value = (parsed as any)[key];
      if (typeof value === "string" && value.trim()) {
        acc[key] = value.trim();
      }
      return acc;
    }, {});
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

  const role = fields.role || "item";
  const label = fields.label;
  const alt = fields.alt;
  const placeholder = fields.placeholder;
  const value = fields.value;
  const href = fields.link;
  const text = fields.text;

  const pieces: string[] = [];

  const roleMap: Record<string, string> = {
    a: "link",
    button: "button",
    link: "link",
    textbox: "input field",
    input: "input field",
    textarea: "text area",
    select: "drop-down menu",
    checkbox: "checkbox",
    radio: "radio button",
    img: "image",
    image: "image",
    navigation: "navigation section",
    search: "search box",
    h1: "heading 1",
    h2: "heading 2",
    h3: "heading 3",
    h4: "heading 4",
    h5: "heading 5",
    h6: "heading 6",
    p: "paragraph",
    span: "text",
    div: "section",
    section: "section",
    article: "article",
    nav: "navigation",
    header: "header",
    footer: "footer",
    main: "main content",
    aside: "sidebar",
    ul: "list",
    ol: "numbered list",
    li: "list item",
    dl: "definition list",
    dt: "definition term",
    dd: "definition",
    table: "table",
    tr: "table row",
    td: "table cell",
    th: "table header cell",
    thead: "table header",
    tbody: "table body",
    tfoot: "table footer",
    form: "form",
    fieldset: "field group",
    legend: "label",
    label: "label",
    audio: "audio player",
    video: "video player",
    canvas: "canvas",
    svg: "graphic",
    blockquote: "quote",
    code: "code",
    pre: "code block",
    strong: "emphasized text",
    em: "emphasized text",
    b: "bold text",
    i: "italic text",
  };

  pieces.push(roleMap[role.toLowerCase()] || roleMap[role] || "page item");

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

function getBackgroundImageUrl(element: Element): string | null {
  const style = window.getComputedStyle(element);
  const backgroundImage = style.backgroundImage;
  if (!backgroundImage || backgroundImage === "none") {
    return null;
  }

  const match = backgroundImage.match(/url\(["']?(.*?)["']?\)/);
  return match ? match[1] : null;
}

function isVisualElement(element: Element) {
  if (!element) {
    return false;
  }

  const tag = element.tagName.toLowerCase();
  if (tag === "img" || tag === "canvas" || tag === "svg" || tag === "video") {
    return true;
  }

  return Boolean(getBackgroundImageUrl(element));
}

async function getBase64FromUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return await blobToBase64(blob);
  } catch (err) {
    console.error(
      "Failed to fetch visual asset (likely a CORS restriction on this image's server):",
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
    const serializer = new XMLSerializer();
    return serializer.serializeToString(element);
  } catch (err) {
    console.error("SVG serialization failed:", err);
    return null;
  }
}

function extractQuotaValue(errorBody: string): number | null {
  try {
    const parsed = JSON.parse(errorBody);
    const details = parsed?.error?.details;
    if (!Array.isArray(details)) return null;
    const quotaFailure = details.find((d: any) =>
      String(d["@type"] || "").includes("QuotaFailure"),
    );
    const value = quotaFailure?.violations?.[0]?.quotaValue;
    const parsedValue = parseInt(value, 10);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

// Gemini's API doesn't expose remaining quota anywhere, so we track our own
// call history locally and estimate usage against the last known daily
// limit. This is an estimate, not a guarantee — Google's actual reset timing
// may not align exactly with a rolling 24h window.
function recordGeminiCall() {
  if (!chrome?.storage?.local) return;
  chrome.storage.local.get(["geminiCallLog"], (result: any) => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const log: number[] = Array.isArray(result.geminiCallLog)
      ? result.geminiCallLog
      : [];
    const pruned = log.filter((t) => t > oneDayAgo);
    pruned.push(now);
    chrome.storage.local.set({ geminiCallLog: pruned });
  });
}

function persistRateLimitState() {
  if (!chrome?.storage?.local) return;
  chrome.storage.local.set({
    aiRateLimitedUntil,
    geminiDailyLimit,
  });
}

function extractRetryDelayMs(errorBody: string): number | null {
  try {
    const parsed = JSON.parse(errorBody);
    const details = parsed?.error?.details;
    if (!Array.isArray(details)) return null;
    const retryInfo = details.find((d: any) =>
      String(d["@type"] || "").includes("RetryInfo"),
    );
    const retryDelay = retryInfo?.retryDelay; // e.g. "21s"
    if (typeof retryDelay !== "string") return null;
    const seconds = parseFloat(retryDelay.replace("s", ""));
    return Number.isFinite(seconds) ? Math.ceil(seconds * 1000) : null;
  } catch {
    return null;
  }
}

async function analyzeVisualElementWithVision(
  element: Element,
  rawDescription: string,
): Promise<string> {
  console.log(
    "[Vision] Starting analysis. aiEnabled:",
    aiEnabled,
    "hasKey:",
    !!geminiKey,
    "isVisual:",
    isVisualElement(element),
  );

  if (!aiEnabled || !geminiKey || !isVisualElement(element)) {
    console.log(
      "[Vision] Skipping: aiEnabled=",
      aiEnabled,
      "geminiKey=",
      !!geminiKey,
      "isVisual=",
      isVisualElement(element),
    );
    return rawDescription;
  }

  if (Date.now() < aiRateLimitedUntil) {
    console.log(
      "[Vision] Skipping: still rate-limited for",
      Math.ceil((aiRateLimitedUntil - Date.now()) / 1000),
      "more seconds",
    );
    return rawDescription;
  }

  if (Date.now() - lastAiCallAt < AI_MIN_INTERVAL_MS) {
    console.log("[Vision] Skipping: calling AI too frequently, back off a bit");
    return rawDescription;
  }
  lastAiCallAt = Date.now();
  recordGeminiCall();

  try {
    let imageData: string | null = null;
    let mediaType = "image/jpeg";

    const tag = element.tagName.toLowerCase();

    if (tag === "img") {
      const img = element as HTMLImageElement;
      const src = img.currentSrc || img.src;
      if (src) {
        imageData = await getBase64FromUrl(src);
      }
    } else if (tag === "canvas") {
      const canvas = element as HTMLCanvasElement;
      imageData = canvas.toDataURL("image/png");
      mediaType = "image/png";
    } else if (tag === "svg") {
      const svg = element as SVGElement;
      const svgString = serializeSvg(svg);
      if (svgString) {
        const encoded = window.btoa(unescape(encodeURIComponent(svgString)));
        imageData = `data:image/svg+xml;base64,${encoded}`;
        mediaType = "image/svg+xml";
      }
    } else if (tag === "video") {
      const video = element as HTMLVideoElement;
      const poster = video.poster;
      if (poster) {
        imageData = await getBase64FromUrl(poster);
      }
    }

    if (!imageData) {
      const bgUrl = getBackgroundImageUrl(element);
      if (bgUrl) {
        const base64 = await getBase64FromUrl(bgUrl);
        if (base64) {
          imageData = base64;
          mediaType = "image/png";
        }
      }
    }

    if (!imageData) {
      return rawDescription;
    }

    if (imageData.startsWith("data:")) {
      const parts = imageData.split(",");
      if (parts.length === 2) {
        const meta = parts[0];
        mediaType = meta.split(";")[0].replace("data:", "") || mediaType;
        imageData = parts[1];
      }
    }

    const payload = {
      contents: [
        {
          parts: [
            {
              text: `Describe this visual content in one or two sentences, in ${getLanguage(speechLang).aiName}. Be concise and focus on what is visible. Respond only in ${getLanguage(speechLang).aiName}, with no English unless that is the element's actual text.`,
            },
            {
              inline_data: {
                mime_type: mediaType,
                data: imageData,
              },
            },
          ],
        },
      ],
    };

    console.log(
      "[Vision] Sending to Google Gemini. Key preview:",
      geminiKey.substring(0, 10) + "...",
    );

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      console.error("[Vision] API error status:", response.status);
      console.error("[Vision] API error body:", body);

      if (response.status === 429) {
        const retryMs = extractRetryDelayMs(body) ?? 30000;
        aiRateLimitedUntil = Date.now() + retryMs;
        const reportedLimit = extractQuotaValue(body);
        if (reportedLimit) {
          geminiDailyLimit = reportedLimit;
        }
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
        updateInfo(`Vision failed (${response.status}). Check console.`);
      }

      return rawDescription;
    }

    console.log("[Vision] Got response, parsing...");
    const data = await response.json();
    console.log(
      "[Vision] Response data:",
      JSON.stringify(data).substring(0, 300) + "...",
    );

    let resultText = "";

    if (
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts
    ) {
      const parts = data.candidates[0].content.parts;
      for (const part of parts) {
        if (part.text) {
          resultText += part.text;
        }
      }
    }

    if (resultText.trim()) {
      console.log("[Vision] Success. Text:", resultText.substring(0, 100));
      return resultText.trim();
    }

    console.log("[Vision] No text extracted from response");
    updateInfo("Gemini responded but no text was extracted.");
    return rawDescription;
  } catch (err) {
    console.error("Vision analysis error:", err);
    return rawDescription;
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

function updateInfo(text: string) {
  infoPanel.textContent = text;
  liveRegion.textContent = text;
}

function stopSpeech() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  if (currentCloudAudio) {
    currentCloudAudio.pause();
    currentCloudAudio = null;
  }
  if (elevenLabsAbortController) {
    elevenLabsAbortController.abort();
    elevenLabsAbortController = null;
  }
  if (elevenLabsDebounceTimer) {
    window.clearTimeout(elevenLabsDebounceTimer);
    elevenLabsDebounceTimer = null;
  }
  speechGeneration++; // invalidate any pending debounced/delayed speech
  if (pendingSpeakTimer) {
    window.clearTimeout(pendingSpeakTimer);
    pendingSpeakTimer = null;
  }
  if (lastAnnounce.timeout) {
    window.clearTimeout(lastAnnounce.timeout);
    lastAnnounce.timeout = 0;
  }
}

// Only returns a voice that actually claims to support this language
// (exact or base-language match). Returns undefined if there's no real
// local support — callers use that to decide whether to reach for a
// cloud voice instead of guessing with a fallback.
function pickExactVoiceForLanguage(
  lang: string,
): SpeechSynthesisVoice | undefined {
  if (!("speechSynthesis" in window)) {
    return undefined;
  }
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    return undefined;
  }
  const exact = voices.find((v) => v.lang === lang);
  if (exact) return exact;
  const base = lang.split("-")[0];
  return voices.find((v) =>
    v.lang.toLowerCase().startsWith(base.toLowerCase()),
  );
}

// Last-resort guess for when there's no real local voice and no cloud
// voice is available either. Google's network voices use a broader
// multilingual model and will generally attempt any script with an
// accent rather than producing no audio at all — better than nothing,
// but not a substitute for real support.
function pickOmnivorousFallbackVoice(): SpeechSynthesisVoice | undefined {
  if (!("speechSynthesis" in window)) {
    return undefined;
  }
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.name.includes("Google"));
}

let voiceMissingWarnedFor: string | null = null;

let elevenLabsBlockedReason: string | null = null;

async function speakWithElevenLabs(text: string): Promise<boolean> {
  if (!elevenLabsKey || !elevenLabsVoiceId) {
    return false;
  }

  if (elevenLabsBlockedReason) {
    // We already know this config can't work (e.g. a 401/402 from a voice
    // ID this account can't use via the API). Don't keep re-hitting the
    // network on every single hover until the user changes something.
    return false;
  }

  // Cancel any previous in-flight request. ElevenLabs caps free accounts
  // at a couple of concurrent requests — rapid hovering was firing several
  // overlapping fetches before any of them resolved, which both burned
  // through that concurrency limit AND looked like abusive traffic to
  // their systems. A new utterance always supersedes whatever was being
  // requested before, so there's never a reason to let an old one finish.
  if (elevenLabsAbortController) {
    elevenLabsAbortController.abort();
  }
  const controller = new AbortController();
  elevenLabsAbortController = controller;

  if (currentCloudAudio) {
    currentCloudAudio.pause();
    currentCloudAudio = null;
  }

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
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
        }),
        signal: controller.signal,
      },
    );

    // A newer call (or a disable) superseded this one while we were
    // waiting on the network — discard the result, it's no longer relevant.
    if (controller.signal.aborted || !isEnabled) {
      return false;
    }

    if (!response.ok) {
      const body = await response.text();
      console.error("[ElevenLabs] API error:", response.status, body);

      if (response.status === 401 || response.status === 402) {
        // This is an account/permission problem, not a transient one —
        // retrying on every hover won't help until the user picks a
        // different voice ID or fixes their plan.
        elevenLabsBlockedReason = `ElevenLabs voice unavailable (${response.status}). This voice ID isn't usable on your current plan via the API — pick a different voice from "My Voices" in the popup, or add one from the Voice Library to your account first.`;
        updateInfo(elevenLabsBlockedReason);
        announce(elevenLabsBlockedReason);
      } else if (response.status === 429) {
        // Concurrency/rate limit — transient, just let it fall back to
        // the local voice for this utterance rather than blocking entirely.
        updateInfo(
          `ElevenLabs is rate-limited (429). Falling back to local voice for now.`,
        );
      } else {
        updateInfo(
          `ElevenLabs voice failed (${response.status}). Falling back to local voice.`,
        );
      }
      return false;
    }

    const blob = await response.blob();

    if (controller.signal.aborted || !isEnabled) {
      return false;
    }

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentCloudAudio = audio;
    audio.onended = () => {
      URL.revokeObjectURL(url);
      if (currentCloudAudio === audio) {
        currentCloudAudio = null;
      }
    };
    await audio.play();
    return true;
  } catch (err) {
    if ((err as any)?.name === "AbortError") {
      // Expected — a newer utterance or a disable canceled this request.
      return false;
    }
    console.error("[ElevenLabs] request failed:", err);
    return false;
  }
}

function announce(text: string, rate = speechRate) {
  if (!isEnabled) {
    return;
  }

  updateInfo(text);

  // Every new utterance supersedes whatever's currently playing, no matter
  // which engine produced it. This has to happen unconditionally up front
  // — not just inside whichever branch we're about to take — otherwise
  // switching from an element that used the local voice to one that uses
  // the cloud voice (or vice versa) leaves the old one still talking while
  // the new one starts.
  window.speechSynthesis?.cancel();
  if (currentCloudAudio) {
    currentCloudAudio.pause();
    currentCloudAudio = null;
  }
  if (elevenLabsAbortController) {
    elevenLabsAbortController.abort();
    elevenLabsAbortController = null;
  }
  if (elevenLabsDebounceTimer) {
    window.clearTimeout(elevenLabsDebounceTimer);
    elevenLabsDebounceTimer = null;
  }
  if (pendingSpeakTimer) {
    window.clearTimeout(pendingSpeakTimer);
    pendingSpeakTimer = null;
  }

  // Tag this call so any async work it kicks off (the cloud-voice debounce,
  // the delayed local-speak timer, the cloud fallback) can tell whether
  // it's been superseded by a newer announce() before it actually speaks.
  const myGeneration = ++speechGeneration;

  // Speak in whatever language the text actually appears to be in, not
  // whatever the "AI description language" setting is — that setting only
  // controls what language Gemini writes descriptions in. The DOM text
  // being read can be in any language regardless.
  const detectedLang = detectScriptLanguage(text);

  const forcedVoice = forcedVoiceName
    ? window.speechSynthesis
        ?.getVoices()
        .find((v) => v.name === forcedVoiceName)
    : undefined;

  // A manual override always wins outright — it means the user already
  // confirmed this voice actually produces audio for what they need.
  const exactLocalVoice =
    forcedVoice ?? pickExactVoiceForLanguage(detectedLang);
  const hasRealLocalVoice = !!exactLocalVoice;

  const speakLocally = (
    voice: SpeechSynthesisVoice | undefined,
    noticeIfMissing: boolean,
  ) => {
    if (!("speechSynthesis" in window)) {
      return;
    }

    const speakNow = () => {
      pendingSpeakTimer = null;
      if (myGeneration !== speechGeneration || !isEnabled) {
        // Superseded by a newer hover, or disabled, since this was
        // scheduled — don't let stale speech start.
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.lang = detectedLang;

      if (voice) {
        utterance.voice = voice;
      } else if (noticeIfMissing && detectedLang !== DEFAULT_LANGUAGE_CODE) {
        if (voiceMissingWarnedFor !== detectedLang) {
          voiceMissingWarnedFor = detectedLang;
          const langName = getLanguage(detectedLang).aiName;
          console.warn(
            `[Speech] No installed voice found for ${detectedLang}. Trying anyway with the lang tag set. ` +
              `Install a system/Chrome voice pack for this language for reliable speech.`,
          );
          updateInfo(
            `Note: no ${langName} voice is installed on this device. Attempting to speak detected ${langName} text anyway — install a ${langName} system voice, pick a Narrator voice override, or enable ElevenLabs cloud voice in the popup, if you hear nothing.`,
          );
        }
      }

      utterance.onerror = (event) => {
        if (event.error === "interrupted" || event.error === "canceled") {
          // Expected when the user moves to a new element before the
          // previous utterance finished — not an actual problem.
          return;
        }
        console.error(
          "[Speech] utterance error:",
          event.error,
          "for detected lang",
          detectedLang,
        );
      };
      utterance.onstart = () => {
        console.log(
          "[Speech] speaking, detected lang:",
          detectedLang,
          "voice:",
          utterance.voice?.name || "(none/default)",
        );
      };

      window.speechSynthesis.speak(utterance);
    };

    // Chrome has a known bug where speak() called immediately after cancel()
    // can silently drop the utterance. A tiny delay avoids the race.
    if (pendingSpeakTimer) {
      window.clearTimeout(pendingSpeakTimer);
    }
    pendingSpeakTimer = window.setTimeout(speakNow, 30);
  };

  console.log(
    "[Speech] decision — detectedLang:",
    detectedLang,
    "hasRealLocalVoice:",
    hasRealLocalVoice,
    "(",
    exactLocalVoice?.name || "none",
    ")",
    "useElevenLabs:",
    useElevenLabs,
    "elevenLabsKey set:",
    !!elevenLabsKey,
    "elevenLabsBlockedReason:",
    elevenLabsBlockedReason,
  );

  if (hasRealLocalVoice) {
    // A real local voice exists for this language (or the user manually
    // forced one) — use it. It's free and instant; no reason to spend
    // ElevenLabs character quota on a language that already works.
    speakLocally(exactLocalVoice, false);
  } else if (useElevenLabs && elevenLabsKey) {
    // No real local voice for this language — this is exactly the case
    // ElevenLabs is for. But don't fire the network request immediately:
    // aborting an in-flight fetch when a newer hover arrives doesn't
    // guarantee the previous request gets canceled on ElevenLabs' server
    // in time, which is exactly what was tripping their concurrency limit
    // during fast hovering. Instead, wait briefly for the hover to settle
    // — only the last one within this window actually reaches the network.
    elevenLabsDebounceTimer = window.setTimeout(() => {
      elevenLabsDebounceTimer = null;
      if (myGeneration !== speechGeneration || !isEnabled) {
        // A newer hover (or a disable) superseded this one before it ever
        // reached the network — correctly do nothing.
        return;
      }
      speakWithElevenLabs(text).then((succeeded) => {
        if (!succeeded && isEnabled && myGeneration === speechGeneration) {
          speakLocally(pickOmnivorousFallbackVoice(), true);
        }
      });
    }, ELEVENLABS_DEBOUNCE_MS);
  } else {
    // No real local voice and no cloud voice configured — best-effort
    // guess with whatever omnivorous voice might be installed.
    speakLocally(pickOmnivorousFallbackVoice(), true);
  }

  if (lastAnnounce.timeout) {
    window.clearTimeout(lastAnnounce.timeout);
  }
  lastAnnounce.timeout = window.setTimeout(() => {
    if (infoPanel.textContent === text) {
      updateInfo("Blind Helper is ready.");
    }
  }, 7000);
}

function setHighlight(element: Element | null) {
  if (!element) {
    highlight.style.display = "none";
    return;
  }

  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    highlight.style.display = "none";
    return;
  }

  highlight.style.display = "block";
  highlight.style.left = `${rect.left}px`;
  highlight.style.top = `${rect.top}px`;
  highlight.style.width = `${rect.width}px`;
  highlight.style.height = `${rect.height}px`;
}

function refreshHighlight() {
  if (currentTarget && isEnabled) {
    setHighlight(currentTarget);
  }
}

function isVisible(element: HTMLElement) {
  if (!element.offsetParent && element !== document.body) {
    return false;
  }
  const style = window.getComputedStyle(element);
  return style.visibility !== "hidden" && style.display !== "none";
}

function collectFocusableElements() {
  return Array.from(
    document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (element) => isVisible(element) && !element.hasAttribute("disabled"),
  );
}

function applySpeechRate(rate: number, announceChange = false) {
  speechRate = clampSpeechRate(rate);
  if (announceChange) {
    announce(`Speech speed ${formatSpeechRate(speechRate)}`, speechRate);
  }
}

function loadSettings() {
  if (!chrome?.storage?.local?.get) {
    return;
  }

  chrome.storage.local.get(
    [
      "aiEnabled",
      "geminiKey",
      "speechRate",
      "speechLang",
      "forcedVoiceName",
      "elevenLabsKey",
      "elevenLabsVoiceId",
      "useElevenLabs",
      "geminiDailyLimit",
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
          : geminiDailyLimit;
      voiceMissingWarnedFor = null;
      applySpeechRate(
        typeof result.speechRate === "number"
          ? result.speechRate
          : SPEECH_RATE_DEFAULT,
      );
      console.log(
        "[Config] Loaded. aiEnabled:",
        aiEnabled,
        "geminiKey set:",
        !!geminiKey,
        "speechRate:",
        speechRate,
        "speechLang:",
        speechLang,
        "useElevenLabs:",
        useElevenLabs,
        "elevenLabsKey set:",
        !!elevenLabsKey,
        "elevenLabsVoiceId:",
        elevenLabsVoiceId,
      );

      if (geminiKey) {
        checkAvailableModels();
      }
    },
  );
}

function saveSpeechRate(rate: number) {
  if (!chrome?.storage?.local?.set) {
    return;
  }

  chrome.storage.local.set({ speechRate: rate });
}

function adjustSpeechRate(delta: number) {
  applySpeechRate(speechRate + delta, true);
  saveSpeechRate(speechRate);
}

async function checkAvailableModels() {
  try {
    console.log("[Debug] Checking available models with your API key...");
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(geminiKey)}`,
    );

    if (!response.ok) {
      console.error(
        "[Debug] Failed to list models:",
        response.status,
        await response.text(),
      );
      return;
    }

    const data = await response.json();
    const models = (data.models || [])
      .filter((m: any) =>
        m.supportedGenerationMethods?.includes("generateContent"),
      )
      .map((m: any) => m.name);

    console.log("[Debug] Available vision models:", models);
  } catch (err) {
    console.error("[Debug] Error checking models:", err);
  }
}

function updateState(enabled: boolean) {
  isEnabled = enabled;
  if (isEnabled) {
    updateInfo(
      "Blind Helper is active. Hover elements or press Tab to navigate.",
    );
  } else {
    stopSpeech();
    currentTarget = null;
    updateInfo("Blind Helper is disabled. Open the popup to enable it.");
    setHighlight(null);
  }
}

function describeAndAnnounce(element: Element | null) {
  if (!element) return;

  if (hoverTimer) {
    window.clearTimeout(hoverTimer);
    hoverTimer = null;
  }

  // Always speak the fast, DOM-based description immediately.
  const rawDescription = describeElement(element);
  const friendly = getFriendlyDescription(rawDescription);
  setHighlight(element);
  announce(friendly);

  // Only spend an AI vision call if the user actually dwells on this element.
  if (!aiEnabled || !isVisualElement(element)) {
    return;
  }

  const myToken = ++hoverToken;
  hoverTimer = window.setTimeout(async () => {
    const aiDescription = await analyzeVisualElementWithVision(
      element,
      friendly,
    );

    if (myToken !== hoverToken || !isEnabled || currentTarget !== element) {
      return;
    }

    setHighlight(element);
    announce(aiDescription);
  }, AI_DWELL_MS);
}

async function handleMouseMove(event: MouseEvent) {
  if (!isEnabled) {
    return;
  }

  const target = event.target as Element | null;
  if (
    !target ||
    target === currentTarget ||
    target === highlight ||
    target === infoPanel ||
    target === liveRegion
  ) {
    return;
  }

  currentTarget = target;
  describeAndAnnounce(target);
}

async function handleKeyDown(event: KeyboardEvent) {
  if (!isEnabled) {
    return;
  }

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
    const currentIndex = focusables.indexOf(
      current ?? (document.body as HTMLElement),
    );
    const direction = event.shiftKey ? -1 : 1;
    focusIndex = currentIndex >= 0 ? currentIndex + direction : 0;
    if (focusIndex < 0) {
      focusIndex = focusables.length - 1;
    }
    focusIndex = focusIndex % focusables.length;

    const next = focusables[focusIndex];
    next.focus();
    describeAndAnnounce(next);
  }
}

function handleMessage(message: any, _sender: any, sendResponse: any) {
  if (!message || typeof message !== "object") {
    return;
  }

  if (message.action === "setEnabled") {
    updateState(Boolean(message.enabled));
    sendResponse({ enabled: isEnabled });
    return;
  }

  if (message.action === "setAiConfig") {
    aiEnabled = Boolean(message.aiEnabled);
    geminiKey = message.geminiKey || "";
    console.log(
      "[Message] setAiConfig received. aiEnabled:",
      aiEnabled,
      "geminiKey set:",
      !!geminiKey,
    );
    sendResponse({ ok: true });
    return;
  }

  if (message.action === "setSpeechRate") {
    applySpeechRate(Number(message.speechRate));
    sendResponse({ speechRate });
    return;
  }

  if (message.action === "setLanguage") {
    speechLang = message.speechLang || DEFAULT_LANGUAGE_CODE;
    voiceMissingWarnedFor = null;
    sendResponse({ speechLang });
    return;
  }

  if (message.action === "setForcedVoice") {
    forcedVoiceName = message.forcedVoiceName || "";
    sendResponse({ forcedVoiceName });
    return;
  }

  if (message.action === "setElevenLabsConfig") {
    elevenLabsKey = message.elevenLabsKey ?? elevenLabsKey;
    elevenLabsVoiceId = message.elevenLabsVoiceId ?? elevenLabsVoiceId;
    useElevenLabs = Boolean(message.useElevenLabs);
    elevenLabsBlockedReason = null;
    sendResponse({
      elevenLabsKey: !!elevenLabsKey,
      elevenLabsVoiceId,
      useElevenLabs,
    });
    return;
  }

  if (message.action === "queryState") {
    sendResponse({
      enabled: isEnabled,
      speechRate,
      speechLang,
      forcedVoiceName,
      useElevenLabs,
    });
    return;
  }

  if (message.action === "announceHover") {
    if (currentTarget) {
      describeAndAnnounce(currentTarget);
      sendResponse({ ok: true });
    } else {
      announce("No hovered item detected yet.");
      sendResponse({ ok: false });
    }
    return;
  }

  if (message.action === "announceFocus") {
    const target =
      document.activeElement instanceof Element ? document.activeElement : null;
    if (target) {
      describeAndAnnounce(target);
      sendResponse({ ok: true });
    } else {
      announce("No focused item detected.");
      sendResponse({ ok: false });
    }
    return;
  }
}

chrome.runtime.onMessage.addListener(handleMessage);

if (chrome?.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes: any, areaName: string) => {
    if (areaName !== "local" || !changes.speechRate) {
      return;
    }

    applySpeechRate(changes.speechRate.newValue ?? SPEECH_RATE_DEFAULT);
  });
}

window.addEventListener("mousemove", handleMouseMove, true);
window.addEventListener("keydown", handleKeyDown, true);
window.addEventListener("scroll", refreshHighlight, true);
window.addEventListener("resize", refreshHighlight);

loadSettings();
updateState(false);
