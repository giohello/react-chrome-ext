const chrome = (window as any).chrome;
let isEnabled = false;
let currentTarget: Element | null = null;
let focusIndex = -1;
let aiEnabled = false;
let geminiKey = "";

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
  const value = (element as HTMLInputElement).value?.trim() || "";
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
    console.error("Failed to fetch visual asset:", err);
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
              text: "Describe this visual content in one or two sentences. Be concise and focus on what is visible.",
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
      updateInfo(`Vision failed (${response.status}). Check console.`);
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
      return `Visual content: ${resultText.trim()}`;
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

async function getDescriptionWithVision(
  element: Element,
  rawDescription: string,
): Promise<string> {
  if (!aiEnabled) {
    return rawDescription;
  }

  const friendly = getFriendlyDescription(rawDescription);

  if (isVisualElement(element)) {
    return await analyzeVisualElementWithVision(element, friendly);
  }

  return friendly;
}

function updateInfo(text: string) {
  infoPanel.textContent = text;
  liveRegion.textContent = text;
}

function announce(text: string) {
  updateInfo(text);
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
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

function loadAiConfig() {
  if (!chrome?.storage?.local?.get) {
    return;
  }

  chrome.storage.local.get(["aiEnabled", "geminiKey"], (result: any) => {
    aiEnabled = Boolean(result.aiEnabled);
    geminiKey = result.geminiKey || "";
    console.log(
      "[Config] Loaded. aiEnabled:",
      aiEnabled,
      "geminiKey set:",
      !!geminiKey,
    );

    if (geminiKey) {
      checkAvailableModels();
    }
  });
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
    updateInfo("Blind Helper is disabled. Open the popup to enable it.");
    setHighlight(null);
  }
}

function describeAndAnnounce(element: Element | null) {
  if (!element) return;
  const rawDescription = describeElement(element);
  getDescriptionWithVision(element, rawDescription).then((description) => {
    setHighlight(element);
    announce(description);
  });
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
  await describeAndAnnounce(target);
}

async function handleKeyDown(event: KeyboardEvent) {
  if (!isEnabled) {
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
    await describeAndAnnounce(next);
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

  if (message.action === "queryState") {
    sendResponse({ enabled: isEnabled });
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

window.addEventListener("mousemove", handleMouseMove, true);
window.addEventListener("keydown", handleKeyDown, true);
window.addEventListener("scroll", refreshHighlight, true);
window.addEventListener("resize", refreshHighlight);

loadAiConfig();
updateState(false);
