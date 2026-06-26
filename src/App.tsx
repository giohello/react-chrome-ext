import { useEffect, useState } from "react";
import "./App.css";

const chromeApi = (window as any).chrome;

function App() {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState("Loading page helper state...");
  const [error, setError] = useState("");
  const [aiEnabled, setAiEnabled] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [hasSavedKey, setHasSavedKey] = useState(false);

  useEffect(() => {
    loadSettings();
    queryState();
  }, []);

  const loadSettings = () => {
    if (!chromeApi?.storage?.local?.get) {
      return;
    }

    chromeApi.storage.local.get(["aiEnabled", "geminiKey"], (result: any) => {
      setAiEnabled(Boolean(result.aiEnabled));
      setApiKey(result.geminiKey || "");
      setHasSavedKey(Boolean(result.geminiKey));
    });
  };

  const saveSettings = async (settings: {
    aiEnabled?: boolean;
    geminiKey?: string;
  }) => {
    if (!chromeApi?.storage?.local?.set) {
      return;
    }

    return new Promise<void>((resolve) => {
      chromeApi.storage.local.set(settings, () => {
        const lastError = chromeApi.runtime?.lastError;
        if (lastError) {
          setError(lastError.message);
        }
        resolve();
      });
    });
  };

  const getActiveTab = () =>
    new Promise<any>((resolve, reject) => {
      if (!chromeApi?.tabs?.query) {
        reject(new Error("Chrome tabs API is unavailable."));
        return;
      }
      chromeApi.tabs.query(
        { active: true, currentWindow: true },
        (tabs: any) => {
          const lastError = chromeApi.runtime?.lastError;
          if (lastError) {
            reject(
              new Error(lastError.message || "Failed to query active tab."),
            );
            return;
          }
          resolve(tabs?.[0]);
        },
      );
    });

  const injectContentScript = async (tabId: number) => {
    if (!chromeApi?.scripting?.executeScript) {
      return;
    }

    return new Promise<void>((resolve, reject) => {
      chromeApi.scripting.executeScript(
        { target: { tabId }, files: ["assets/content.js"] },
        () => {
          const lastError = chromeApi.runtime?.lastError;
          if (lastError) {
            reject(
              new Error(
                lastError.message || "Content script injection failed.",
              ),
            );
            return;
          }
          resolve();
        },
      );
    });
  };

  const sendToActiveTab = async (message: any) => {
    setError("");
    const tab = await getActiveTab();
    if (!tab?.id || !chromeApi?.tabs?.sendMessage) {
      throw new Error("Unable to find active tab or send a message.");
    }

    const trySend = () =>
      new Promise<any>((resolve, reject) => {
        chromeApi.tabs.sendMessage(tab.id, message, (response: any) => {
          const lastError = chromeApi.runtime?.lastError;
          if (lastError) {
            reject(new Error(lastError.message || "Failed to send message."));
            return;
          }
          resolve(response);
        });
      });

    try {
      return await trySend();
    } catch (error: any) {
      if (
        error?.message?.includes("Receiving end does not exist") ||
        error?.message?.includes("Could not establish connection")
      ) {
        await injectContentScript(tab.id);
        return await trySend();
      }
      throw error;
    }
  };

  const queryState = async () => {
    try {
      const response = await sendToActiveTab({ action: "queryState" });
      const enabledState = Boolean(response?.enabled);
      setEnabled(enabledState);
      setStatus(
        enabledState ? "Page helper is enabled." : "Page helper is disabled.",
      );
    } catch (err: any) {
      setStatus("Page helper is not available on this site yet.");
      setError(err.message);
    }
  };

  const toggleEnabled = async () => {
    try {
      const response = await sendToActiveTab({
        action: "setEnabled",
        enabled: !enabled,
      });
      setEnabled(Boolean(response?.enabled));
      setStatus(
        response?.enabled
          ? "Page helper is enabled."
          : "Page helper is disabled.",
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  const setAiConfig = async (value: boolean) => {
    setAiEnabled(value);
    await saveSettings({ aiEnabled: value });
    try {
      await sendToActiveTab({
        action: "setAiConfig",
        aiEnabled: value,
        geminiKey: apiKey,
      });
    } catch {
      // ignore if content script is not active yet
    }
  };

  const saveApiKey = async () => {
    setError("");
    setHasSavedKey(Boolean(apiKey));
    await saveSettings({ geminiKey: apiKey });
    try {
      await sendToActiveTab({
        action: "setAiConfig",
        aiEnabled,
        geminiKey: apiKey,
      });
    } catch {
      // ignore if content script is not active yet
    }
  };

  const announce = async (action: "announceHover" | "announceFocus") => {
    try {
      await sendToActiveTab({ action });
      setStatus(
        action === "announceHover"
          ? "Announced current hover target."
          : "Announced current focus target.",
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <main className="popup">
      <header>
        <h1>Blind Helper</h1>
        <p>
          Turn on the page helper, then hover or press Tab to hear the current
          element.
        </p>
      </header>

      <div className="status">
        <span>Status</span>
        <strong>{enabled ? "Enabled" : "Disabled"}</strong>
      </div>

      <button type="button" className="primary" onClick={toggleEnabled}>
        {enabled ? "Disable" : "Enable"} page helper
      </button>

      <section className="field">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={aiEnabled}
            onChange={(event) => setAiConfig(event.target.checked)}
          />
          Use Google Gemini vision to analyze images and elements
        </label>
        <p className="hint">
          Paste a Google Gemini API key to enable visual analysis of images and
          elements. Get a free key from Google AI Studio.
        </p>
      </section>

      <section className="field">
        <label htmlFor="api-key">Google Gemini API Key</label>
        <input
          id="api-key"
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="AQ.Ab8RN..."
        />
        <div className="field-actions">
          <button type="button" className="secondary" onClick={saveApiKey}>
            Save API key
          </button>
          {hasSavedKey ? <span className="saved-badge">saved</span> : null}
        </div>
      </section>

      <button
        type="button"
        onClick={() => announce("announceHover")}
        disabled={!enabled}
      >
        Announce hovered element
      </button>
      <button
        type="button"
        onClick={() => announce("announceFocus")}
        disabled={!enabled}
      >
        Announce focused element
      </button>

      <section className="help">
        <h2>How to use</h2>
        <ul>
          <li>Enable the helper from this popup.</li>
          <li>Move your mouse over elements to hear descriptions.</li>
          <li>Use Tab to navigate focusable controls and labels.</li>
          <li>Add a Google Gemini API key for AI-powered image analysis.</li>
        </ul>
      </section>

      <div className="feedback">
        <p>{status}</p>
        {error ? <p className="error">{error}</p> : null}
      </div>
    </main>
  );
}

export default App;
