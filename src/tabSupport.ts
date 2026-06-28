const RESTRICTED_URL_PATTERNS = [
  /^chrome:\/\//i,
  /^chrome-extension:\/\//i,
  /^edge:\/\//i,
  /^about:/i,
  /^devtools:\/\//i,
  /^view-source:/i,
  /^https:\/\/chrome\.google\.com\/webstore/i,
];

export function getUnsupportedTabMessage(url?: string) {
  if (!url) {
    return "Open a normal website tab, then click the extension icon again.";
  }

  if (/^file:\/\//i.test(url)) {
    return "This page uses a local file URL. Enable file access for Blind Helper in chrome://extensions, then reload the page.";
  }

  if (RESTRICTED_URL_PATTERNS.some((pattern) => pattern.test(url))) {
    return "Blind Helper cannot run on browser pages like chrome:// or the Web Store. Open a regular website first.";
  }

  return null;
}

export function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
