import { useEffect, useState } from "react";
import "./App.css";
import {
  SPEECH_RATE_DEFAULT,
  SPEECH_RATE_MAX,
  SPEECH_RATE_MIN,
  SPEECH_RATE_STEP,
  clampSpeechRate,
  formatSpeechRate,
} from "./speechConfig";
import { getUnsupportedTabMessage, wait } from "./tabSupport";
import { DEFAULT_LANGUAGE_CODE, LANGUAGES } from "./languages";
import { useTranslation } from "./i18n/useTranslation";

const chromeApi = (window as any).chrome;

function App() {
  const { t, uiLanguage, changeLanguage } = useTranslation();
  const [enabled, setEnabled] = useState(false);
  const [statusKey, setStatusKey] = useState<"loading" | "enabled" | "disabled" | "notAvailable">("loading");
  const [error, setError] = useState("");
  const [aiEnabled, setAiEnabled] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const [speechRate, setSpeechRate] = useState(SPEECH_RATE_DEFAULT);
  const [speechLang, setSpeechLang] = useState(DEFAULT_LANGUAGE_CODE);
  const [forcedVoiceName, setForcedVoiceName] = useState("");
  const [availableVoices, setAvailableVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);
  const [elevenLabsKey, setElevenLabsKey] = useState("");
  const [elevenLabsVoiceId, setElevenLabsVoiceId] = useState(
    "21m00Tcm4TlvDq8ikWAM",
  );
  const [elevenLabsVoices, setElevenLabsVoices] = useState<
    { voice_id: string; name: string; category?: string }[]
  >([]);
  const [elevenLabsVoicesError, setElevenLabsVoicesError] = useState("");
  const [useElevenLabs, setUseElevenLabs] = useState(false);
  const [elevenLabsSavedKey, setElevenLabsSavedKey] = useState(false);
  const [elevenLabsUsage, setElevenLabsUsage] = useState<{
    used: number;
    limit: number;
  } | null>(null);
  const [elevenLabsUsageError, setElevenLabsUsageError] = useState("");
  const [geminiUsage, setGeminiUsage] = useState<{
    used: number;
    limit: number;
    rateLimitedUntil: number;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);

    loadSettings();
    queryState();

    const loadVoices = () => {
      const voices = window.speechSynthesis?.getVoices() ?? [];
      if (voices.length > 0) {
        setAvailableVoices(voices);
      }
    };
    loadVoices();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    if (!chromeApi?.storage?.onChanged) {
      return;
    }

    const handleStorageChange = (changes: any, areaName: string) => {
      if (areaName !== "local") {
        return;
      }

      if (changes.speechRate) {
        setSpeechRate(
          clampSpeechRate(changes.speechRate.newValue ?? SPEECH_RATE_DEFAULT),
        );
      }

      if (changes.speechLang) {
        setSpeechLang(changes.speechLang.newValue ?? DEFAULT_LANGUAGE_CODE);
      }

      if (changes.forcedVoiceName) {
        setForcedVoiceName(changes.forcedVoiceName.newValue ?? "");
      }

      if (
        changes.elevenLabsKey ||
        changes.elevenLabsVoiceId ||
        changes.useElevenLabs
      ) {
        loadSettings();
      }

      if (
        changes.geminiCallLog ||
        changes.geminiDailyLimit ||
        changes.aiRateLimitedUntil
      ) {
        refreshGeminiUsage();
      }
    };

    chromeApi.storage.onChanged.addListener(handleStorageChange);

    refreshGeminiUsage();
    const geminiUsageInterval = window.setInterval(refreshGeminiUsage, 5000);

    return () => {
      chromeApi.storage.onChanged.removeListener(handleStorageChange);
      window.clearInterval(geminiUsageInterval);
      clearInterval(timer);
    };
  }, []);

  const refreshGeminiUsage = () => {
    if (!chromeApi?.storage?.local?.get) {
      return;
    }
    chromeApi.storage.local.get(
      ["geminiCallLog", "geminiDailyLimit", "aiRateLimitedUntil"],
      (result: any) => {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const log: number[] = Array.isArray(result.geminiCallLog)
          ? result.geminiCallLog
          : [];
        const used = log.filter((t) => t > oneDayAgo).length;
        const limit =
          typeof result.geminiDailyLimit === "number"
            ? result.geminiDailyLimit
            : 20;
        const rateLimitedUntil =
          typeof result.aiRateLimitedUntil === "number"
            ? result.aiRateLimitedUntil
            : 0;
        setGeminiUsage({ used, limit, rateLimitedUntil });
      },
    );
  };

  const refreshElevenLabsUsage = async (keyOverride?: string) => {
    const key = keyOverride ?? elevenLabsKey;
    if (!key) {
      setElevenLabsUsageError("Add an ElevenLabs API key first.");
      return;
    }
    setElevenLabsUsageError("");
    try {
      const response = await fetch(
        "https://api.elevenlabs.io/v1/user/subscription",
        {
          headers: { "xi-api-key": key },
        },
      );
      if (!response.ok) {
        throw new Error(`ElevenLabs usage check failed (${response.status}).`);
      }
      const data = await response.json();
      setElevenLabsUsage({
        used: data.character_count ?? 0,
        limit: data.character_limit ?? 0,
      });
    } catch (err: any) {
      setElevenLabsUsageError(
        err.message || "Could not check ElevenLabs usage.",
      );
    }
  };

  const refreshElevenLabsVoices = async (keyOverride?: string) => {
    const key = keyOverride ?? elevenLabsKey;
    if (!key) {
      setElevenLabsVoicesError("Add an ElevenLabs API key first.");
      return;
    }
    setElevenLabsVoicesError("");
    try {
      const response = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: { "xi-api-key": key },
      });
      if (!response.ok) {
        throw new Error(`Could not list voices (${response.status}).`);
      }
      const data = await response.json();
      const voices = Array.isArray(data.voices) ? data.voices : [];
      setElevenLabsVoices(voices);

      // If the currently saved voice ID isn't actually in this account's
      // list, it's almost certainly a library voice ID that the API can't
      // use on a free plan — switch to the first real, usable voice.
      if (
        voices.length > 0 &&
        !voices.some((v: any) => v.voice_id === elevenLabsVoiceId)
      ) {
        updateElevenLabsVoiceId(voices[0].voice_id);
      }
    } catch (err: any) {
      setElevenLabsVoicesError(
        err.message || "Could not list ElevenLabs voices.",
      );
    }
  };

  const loadSettings = () => {
    if (!chromeApi?.storage?.local?.get) {
      return;
    }

    chromeApi.storage.local.get(
      [
        "aiEnabled",
        "geminiKey",
        "speechRate",
        "speechLang",
        "forcedVoiceName",
        "elevenLabsKey",
        "elevenLabsVoiceId",
        "useElevenLabs",
      ],
      (result: any) => {
        setAiEnabled(Boolean(result.aiEnabled));
        setApiKey(result.geminiKey || "");
        setHasSavedKey(Boolean(result.geminiKey));
        setSpeechRate(
          clampSpeechRate(
            typeof result.speechRate === "number"
              ? result.speechRate
              : SPEECH_RATE_DEFAULT,
          ),
        );
        setSpeechLang(result.speechLang || DEFAULT_LANGUAGE_CODE);
        setForcedVoiceName(result.forcedVoiceName || "");
        setElevenLabsKey(result.elevenLabsKey || "");
        setElevenLabsVoiceId(
          result.elevenLabsVoiceId || "21m00Tcm4TlvDq8ikWAM",
        );
        setUseElevenLabs(Boolean(result.useElevenLabs));
        setElevenLabsSavedKey(Boolean(result.elevenLabsKey));
        if (result.elevenLabsKey) {
          refreshElevenLabsVoices(result.elevenLabsKey);
        }
      },
    );
  };

  const saveSettings = async (settings: {
    aiEnabled?: boolean;
    geminiKey?: string;
    speechRate?: number;
    speechLang?: string;
    forcedVoiceName?: string;
    elevenLabsKey?: string;
    elevenLabsVoiceId?: string;
    useElevenLabs?: boolean;
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
      throw new Error("Script injection is unavailable in this browser.");
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

    const unsupportedMessage = getUnsupportedTabMessage(tab.url);
    if (unsupportedMessage) {
      throw new Error(unsupportedMessage);
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

    const isMissingReceiver = (error: any) =>
      error?.message?.includes("Receiving end does not exist") ||
      error?.message?.includes("Could not establish connection");

    try {
      return await trySend();
    } catch (error: any) {
      if (!isMissingReceiver(error)) {
        throw error;
      }

      await injectContentScript(tab.id);
      await wait(75);

      try {
        return await trySend();
      } catch (retryError: any) {
        if (isMissingReceiver(retryError)) {
          throw new Error(
            "Could not connect to the page helper. Reload the tab, then open this popup again.",
          );
        }
        throw retryError;
      }
    }
  };

  const queryState = async () => {
    try {
      const response = await sendToActiveTab({ action: "queryState" });
      const enabledState = Boolean(response?.enabled);
      setEnabled(enabledState);
      if (typeof response?.speechRate === "number") {
        setSpeechRate(clampSpeechRate(response.speechRate));
      }
      if (typeof response?.speechLang === "string" && response.speechLang) {
        setSpeechLang(response.speechLang);
      }
      if (typeof response?.forcedVoiceName === "string") {
        setForcedVoiceName(response.forcedVoiceName);
      }
      setStatusKey(enabledState ? "enabled" : "disabled");
    } catch (err: any) {
      setStatusKey("notAvailable");
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
      setStatusKey(response?.enabled ? "enabled" : "disabled");
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

  const updateSpeechRate = async (value: number) => {
    const nextRate = clampSpeechRate(value);
    setSpeechRate(nextRate);
    await saveSettings({ speechRate: nextRate });
    try {
      await sendToActiveTab({
        action: "setSpeechRate",
        speechRate: nextRate,
      });
    } catch {
      // ignore if content script is not active yet
    }
  };

  const updateSpeechLang = async (value: string) => {
    setSpeechLang(value);
    await saveSettings({ speechLang: value });
    try {
      await sendToActiveTab({
        action: "setLanguage",
        speechLang: value,
      });
    } catch {
      // ignore if content script is not active yet
    }
  };

  const updateForcedVoice = async (value: string) => {
    setForcedVoiceName(value);
    await saveSettings({ forcedVoiceName: value });
    try {
      await sendToActiveTab({
        action: "setForcedVoice",
        forcedVoiceName: value,
      });
    } catch {
      // ignore if content script is not active yet
    }
  };

  const pushElevenLabsConfig = async (overrides: {
    elevenLabsKey?: string;
    elevenLabsVoiceId?: string;
    useElevenLabs?: boolean;
  }) => {
    // Read the current values from storage rather than React state — this
    // function can be called from inside the very first loadSettings()
    // callback (e.g. the auto-voice-correction path), before React has
    // actually re-rendered with the freshly loaded values. Trusting the
    // closure there would silently push back the initial useState
    // defaults ("" / false) and clobber a correctly saved config.
    const stored: any = await new Promise((resolve) => {
      if (!chromeApi?.storage?.local?.get) {
        resolve({});
        return;
      }
      chromeApi.storage.local.get(
        ["elevenLabsKey", "elevenLabsVoiceId", "useElevenLabs"],
        (result: any) => resolve(result || {}),
      );
    });

    try {
      await sendToActiveTab({
        action: "setElevenLabsConfig",
        elevenLabsKey: overrides.elevenLabsKey ?? stored.elevenLabsKey ?? "",
        elevenLabsVoiceId:
          overrides.elevenLabsVoiceId ??
          stored.elevenLabsVoiceId ??
          elevenLabsVoiceId,
        useElevenLabs: overrides.useElevenLabs ?? Boolean(stored.useElevenLabs),
      });
    } catch {
      // ignore if content script is not active yet
    }
  };

  const saveElevenLabsKey = async () => {
    setElevenLabsSavedKey(Boolean(elevenLabsKey));
    await saveSettings({ elevenLabsKey });
    await pushElevenLabsConfig({ elevenLabsKey });
    refreshElevenLabsUsage(elevenLabsKey);
    refreshElevenLabsVoices(elevenLabsKey);
  };

  const updateElevenLabsVoiceId = async (value: string) => {
    setElevenLabsVoiceId(value);
    await saveSettings({ elevenLabsVoiceId: value });
    await pushElevenLabsConfig({ elevenLabsVoiceId: value });
  };

  const updateUseElevenLabs = async (value: boolean) => {
    setUseElevenLabs(value);
    await saveSettings({ useElevenLabs: value });
    await pushElevenLabsConfig({ useElevenLabs: value });
  };

  return (
    <main className="popup">
      <header>
        <h1>{t("appTitle")}</h1>
        <p>{t("appDescription")}</p>
      </header>

      <div className="status">
        <span>{t("statusLabel")}</span>
        <strong>{enabled ? t("statusEnabled") : t("statusDisabled")}</strong>
      </div>

      <button type="button" className="primary" onClick={toggleEnabled}>
        {enabled ? t("toggleButtonDisable") : t("toggleButton")}
      </button>

      <section className="field">
        <label htmlFor="ui-language">{t("interfaceLangLabel")}</label>
        <select
          id="ui-language"
          value={uiLanguage}
          onChange={(event) => changeLanguage(event.target.value as any)}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </section>

      <section className="field">
        <label htmlFor="speech-lang">{t("imageDescLangLabel")}</label>
        <select
          id="speech-lang"
          value={speechLang}
          onChange={(event) => updateSpeechLang(event.target.value)}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
        <p className="hint">{t("imageDescLangHint")}</p>
      </section>

      <section className="field">
        <label htmlFor="narrator-voice">{t("voiceLabel")}</label>
        <select
          id="narrator-voice"
          value={forcedVoiceName}
          onChange={(event) => updateForcedVoice(event.target.value)}
        >
          <option value="">{t("voiceAuto")}</option>
          {availableVoices.map((voice) => (
            <option key={voice.name} value={voice.name}>
              {voice.name} ({voice.lang})
            </option>
          ))}
        </select>
        <p className="hint">{t("voiceHint")}</p>
      </section>

      <section className="field">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={useElevenLabs}
            onChange={(event) => updateUseElevenLabs(event.target.checked)}
          />
          {t("useElevenLabsLabel")}
        </label>

        <label htmlFor="elevenlabs-key">{t("elevenLabsKeyLabel")}</label>
        <input
          id="elevenlabs-key"
          type="password"
          value={elevenLabsKey}
          onChange={(event) => setElevenLabsKey(event.target.value)}
          placeholder={t("elevenLabsKeyPlaceholder")}
        />
        <div className="field-actions">
          <button
            type="button"
            className="secondary"
            onClick={saveElevenLabsKey}
          >
            {t("saveKeyButton")}
          </button>
          {elevenLabsSavedKey ? (
            <span className="saved-badge">{t("savedBadge")}</span>
          ) : null}
        </div>

        <label htmlFor="elevenlabs-voice-id">{t("elevenLabsVoiceLabel")}</label>
        {elevenLabsVoices.length > 0 ? (
          <select
            id="elevenlabs-voice-id"
            value={elevenLabsVoiceId}
            onChange={(event) => updateElevenLabsVoiceId(event.target.value)}
          >
            {elevenLabsVoices.map((voice) => (
              <option key={voice.voice_id} value={voice.voice_id}>
                {voice.name}
                {voice.category ? ` (${voice.category})` : ""}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="elevenlabs-voice-id"
            type="text"
            value={elevenLabsVoiceId}
            onChange={(event) => updateElevenLabsVoiceId(event.target.value)}
            placeholder={t("elevenLabsVoicePlaceholder")}
          />
        )}
        <div className="field-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => refreshElevenLabsVoices()}
          >
            {t("refreshVoicesButton")}
          </button>
        </div>
        {elevenLabsVoicesError ? (
          <p className="error">{elevenLabsVoicesError}</p>
        ) : null}
        <p className="hint">{t("elevenLabsHint")}</p>

        <div className="field-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => refreshElevenLabsUsage()}
          >
            {t("refreshUsageButton")}
          </button>
        </div>
        {elevenLabsUsage ? (
          <p className="hint">
            {elevenLabsUsage.used.toLocaleString()} / {elevenLabsUsage.limit.toLocaleString()} characters used
          </p>
        ) : null}
        {elevenLabsUsageError ? (
          <p className="error">{elevenLabsUsageError}</p>
        ) : null}

        <p className="hint">{t("quotaHint")}</p>
      </section>

      <section className="field">
        <p className="hint" style={{ marginTop: 0 }}>
          <strong>{t("geminiUsageTitle")}</strong>
        </p>
        {geminiUsage ? (
          <>
            <p className="hint">
              {geminiUsage.used} / {geminiUsage.limit} requests used in the last 24 hours.
            </p>
            {geminiUsage.rateLimitedUntil > currentTime ? (
              <p className="error">
                Currently rate-limited. Retrying automatically in{" "}
                {Math.max(
                  0,
                  Math.ceil(
                    (geminiUsage.rateLimitedUntil - currentTime) / 1000,
                  ),
                )}
                s. Basic (non-AI) descriptions are being used until then.
              </p>
            ) : null}
            <p className="hint">{t("geminiEstimateHint")}</p>
          </>
        ) : (
          <p className="hint">{t("geminiNoRequests")}</p>
        )}
      </section>

      <section className="field">
        <div className="speed-header">
          <label htmlFor="speech-rate">{t("speechRateLabel")}</label>
          <strong aria-live="polite">{formatSpeechRate(speechRate)}x</strong>
        </div>
        <input
          id="speech-rate"
          type="range"
          min={SPEECH_RATE_MIN}
          max={SPEECH_RATE_MAX}
          step={SPEECH_RATE_STEP}
          value={speechRate}
          onChange={(event) => updateSpeechRate(Number(event.target.value))}
          aria-valuemin={SPEECH_RATE_MIN}
          aria-valuemax={SPEECH_RATE_MAX}
          aria-valuenow={speechRate}
          aria-valuetext={`${formatSpeechRate(speechRate)} times normal speed`}
        />
        <p className="hint">{t("speechRateHint")}</p>
      </section>

      <section className="field">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={aiEnabled}
            onChange={(event) => setAiConfig(event.target.checked)}
          />
          {t("useAiLabel")}
        </label>
        <p className="hint">{t("useAiHint")}</p>
      </section>

      <section className="field">
        <label htmlFor="api-key">{t("geminiKeyLabel")}</label>
        <input
          id="api-key"
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder={t("geminiKeyPlaceholder")}
        />
        <div className="field-actions">
          <button type="button" className="secondary" onClick={saveApiKey}>
            {t("saveGeminiKeyButton")}
          </button>
          {hasSavedKey ? (
            <span className="saved-badge">{t("savedBadge")}</span>
          ) : null}
        </div>
      </section>

      <section className="help">
        <h2>{t("helpTitle")}</h2>
        <ul>
          <li>{t("helpItem1")}</li>
          <li>{t("helpItem2")}</li>
          <li>{t("helpItem3")}</li>
          <li>{t("helpItem4")}</li>
          <li>{t("helpItem5")}</li>
          <li>{t("helpItem6")}</li>
        </ul>
      </section>

      <div className="feedback">
        <p>
          {statusKey === "loading" && t("loadingState")}
          {statusKey === "enabled" && t("statusEnabledMessage")}
          {statusKey === "disabled" && t("statusDisabledMessage")}
          {statusKey === "notAvailable" && t("notAvailableState")}
        </p>
        {error ? <p className="error">{error}</p> : null}
      </div>
    </main>
  );
}

export default App;
