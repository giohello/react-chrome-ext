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

function describeElement(element: Element | null) {
  if (!element) {
    return "No element selected.";
  }

  const tag = element.tagName.toLowerCase();
  const role = element.getAttribute("role");
  const label =
    element.getAttribute("aria-label") ||
    getTextFromLabelledBy(element) ||
    (element as HTMLElement).getAttribute("title") ||
    "";
  const alt = (element as HTMLImageElement).alt?.trim() || "";
  const value = (element as HTMLInputElement).value?.trim() || "";
  const placeholder = (element as HTMLInputElement).placeholder?.trim() || "";
  const text = element.textContent?.trim() || "";
  const href = element instanceof HTMLAnchorElement ? element.href : "";
  const type = element instanceof HTMLInputElement ? element.type : "";

  const parts = [role || tag]
    .concat(
      label ? [`label: ${label}`] : [],
      alt ? [`alt: ${alt}`] : [],
      type ? [`type: ${type}`] : [],
      placeholder ? [`placeholder: ${placeholder}`] : [],
      value ? [`value: ${value}`] : [],
      href ? [`link: ${href}`] : [],
      text ? [`text: ${text}`] : [],
    )
    .filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : `Page element: ${tag}`;
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

function getFriendlyDescription(rawDescription: string) {
  const fields = rawDescription
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

  const role = fields.role || "item";
  const label = fields.label;
  const alt = fields.alt;
  const placeholder = fields.placeholder;
  const value = fields.value;
  const href = fields.link;
  const text = fields.text;

  const pieces: string[] = [];

  const roleMap: Record<string, string> = {
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
  };

  pieces.push(roleMap[role] || "page item");

  if (label) {
    pieces.push(`labeled ${label}`);
  } else if (alt) {
    pieces.push(`showing ${alt}`);
  } else if (text) {
    pieces.push(text);
  } else if (placeholder) {
    pieces.push(`with placeholder ${placeholder}`);
  }

  if (href && role === "link") {
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
  if (!aiEnabled || !geminiKey || !isVisualElement(element)) {
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

    const imageUrl = `data:${mediaType};base64,${imageData}`;
    const payload = {
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Describe this visual content in one or two sentences. Be concise and focus on what is visible.",
            },
            {
              type: "input_image",
              image_url: imageUrl,
            },
          ],
        },
      ],
    };

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${geminiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("Vision API error:", body);
      updateInfo("Gemini vision request failed. See console for details.");
      return rawDescription;
    }

    const data = await response.json();
    const outputItems = Array.isArray(data.output)
      ? data.output
      : [data.output];
    let resultText = "";

    for (const output of outputItems) {
      if (!output || !Array.isArray(output.content)) {
        continue;
      }
      for (const item of output.content) {
        if (item?.type === "output_text" && item?.text) {
          resultText += item.text;
        }
      }
    }

    if (!resultText.trim() && typeof data.output_text === "string") {
      resultText = data.output_text;
    }

    if (resultText.trim()) {
      return `Visual content: ${resultText.trim()}`;
    }

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
  highlight.style.left = `${rect.left + window.scrollX}px`;
  highlight.style.top = `${rect.top + window.scrollY}px`;
  highlight.style.width = `${rect.width}px`;
  highlight.style.height = `${rect.height}px`;
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
  });
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

loadAiConfig();
updateState(false);
