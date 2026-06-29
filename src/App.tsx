import { useEffect, useState, useCallback } from "react";
import "./App.css";
import { clampSpeechRate, formatSpeechRate } from "./speechConfig";
import { SPEECH_RATE_MIN, SPEECH_RATE_MAX, SPEECH_RATE_STEP } from "./constants";
import { LANGUAGES } from "./languages";
import { useTranslation } from "./i18n/useTranslation";
import { useSettings } from "./hooks/useSettings";
import { useTabMessaging } from "./hooks/useTabMessaging";
import { useElevenLabsApi } from "./hooks/useElevenLabsApi";
import { useSpeechVoices } from "./hooks/useSpeechVoices";

const chromeApi = (window as any).chrome;

function App() {
  const { t, uiLanguage, changeLanguage } = useTranslation();
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  const { settings, patch, geminiUsage, saveToStorage } =
    useSettings();
  const { sendToActiveTab } = useTabMessaging(setError);
  const elevenLabs = useElevenLabsApi();
  const availableVoices = useSpeechVoices();

  // Keep the countdown timer for rate-limit display ticking every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Query the active tab's current state on mount
  useEffect(() => {
    const queryState = async () => {
      try {
        const response = await sendToActiveTab({ action: "queryState" });
        setEnabled(Boolean(response?.enabled));
        if (typeof response?.speechRate === "number") {
          patch({ speechRate: clampSpeechRate(response.speechRate) });
        }
        if (typeof response?.speechLang === "string" && response.speechLang) {
          patch({ speechLang: response.speechLang });
        }
        if (typeof response?.forcedVoiceName === "string") {
          patch({ forcedVoiceName: response.forcedVoiceName });
        }
      } catch (err: any) {
        setError(err.message);
      }
    };

    queryState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load ElevenLabs voices once key is available
  useEffect(() => {
    if (settings.elevenLabsKey) {
      elevenLabs.refreshVoices(
        settings.elevenLabsKey,
        settings.elevenLabsVoiceId,
        updateElevenLabsVoiceId,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.elevenLabsKey]);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /** Reads the freshest ElevenLabs config from storage and pushes it to the
   *  content script. Called from within loadSettings callbacks where React
   *  state may not yet reflect the freshly written values. */
  const pushElevenLabsConfig = useCallback(
    async (overrides: {
      elevenLabsKey?: string;
      elevenLabsVoiceId?: string;
      useElevenLabs?: boolean;
    }) => {
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
            settings.elevenLabsVoiceId,
          useElevenLabs:
            overrides.useElevenLabs ?? Boolean(stored.useElevenLabs),
        });
      } catch {
        // ignore if content script is not active yet
      }
    },
    [sendToActiveTab, settings.elevenLabsVoiceId],
  );

  // ─── Actions ────────────────────────────────────────────────────────────────

  const toggleEnabled = async () => {
    try {
      const response = await sendToActiveTab({
        action: "setEnabled",
        enabled: !enabled,
      });
      setEnabled(Boolean(response?.enabled));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const setAiConfig = async (value: boolean) => {
    patch({ aiEnabled: value });
    await saveToStorage({ aiEnabled: value });
    try {
      await sendToActiveTab({
        action: "setAiConfig",
        aiEnabled: value,
        geminiKey: settings.apiKey,
      });
    } catch {
      // ignore if content script is not active yet
    }
  };

  const saveApiKey = async () => {
    setError("");
    patch({ hasSavedKey: Boolean(settings.apiKey) });
    await saveToStorage({ geminiKey: settings.apiKey });
    try {
      await sendToActiveTab({
        action: "setAiConfig",
        aiEnabled: settings.aiEnabled,
        geminiKey: settings.apiKey,
      });
    } catch {
      // ignore if content script is not active yet
    }
  };

  const updateSpeechRate = async (value: number) => {
    const nextRate = clampSpeechRate(value);
    patch({ speechRate: nextRate });
    await saveToStorage({ speechRate: nextRate });
    try {
      await sendToActiveTab({ action: "setSpeechRate", speechRate: nextRate });
    } catch {
      // ignore if content script is not active yet
    }
  };

  const updateSpeechLang = async (value: string) => {
    patch({ speechLang: value });
    await saveToStorage({ speechLang: value });
    try {
      await sendToActiveTab({ action: "setLanguage", speechLang: value });
    } catch {
      // ignore if content script is not active yet
    }
  };

  const updateForcedVoice = async (value: string) => {
    patch({ forcedVoiceName: value });
    await saveToStorage({ forcedVoiceName: value });
    try {
      await sendToActiveTab({
        action: "setForcedVoice",
        forcedVoiceName: value,
      });
    } catch {
      // ignore if content script is not active yet
    }
  };

  const saveElevenLabsKey = async () => {
    patch({ elevenLabsSavedKey: Boolean(settings.elevenLabsKey) });
    await saveToStorage({ elevenLabsKey: settings.elevenLabsKey });
    await pushElevenLabsConfig({ elevenLabsKey: settings.elevenLabsKey });
    elevenLabs.refreshUsage(settings.elevenLabsKey);
    elevenLabs.refreshVoices(
      settings.elevenLabsKey,
      settings.elevenLabsVoiceId,
      updateElevenLabsVoiceId,
    );
  };

  const updateElevenLabsVoiceId = async (value: string) => {
    patch({ elevenLabsVoiceId: value });
    await saveToStorage({ elevenLabsVoiceId: value });
    await pushElevenLabsConfig({ elevenLabsVoiceId: value });
  };

  const updateUseElevenLabs = async (value: boolean) => {
    patch({ useElevenLabs: value });
    await saveToStorage({ useElevenLabs: value });
    await pushElevenLabsConfig({ useElevenLabs: value });
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

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

      {/* UI Language */}
      <section className="field">
        <label htmlFor="ui-language">{t("interfaceLangLabel")}</label>
        <select
          id="ui-language"
          value={uiLanguage}
          onChange={(e) => changeLanguage(e.target.value as any)}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </section>

      {/* Gemini usage */}
      <section className="field">
        <p className="hint" style={{ marginTop: 0 }}>
          <strong>{t("geminiUsageTitle")}</strong>
        </p>
        {geminiUsage ? (
          <>
            <p className="hint">
              {geminiUsage.used} / {geminiUsage.limit} requests used in the last 24 hours.
            </p>
            {geminiUsage.rateLimitedUntil > currentTime && (
              <p className="error">
                Currently rate-limited. Retrying automatically in{" "}
                {Math.max(
                  0,
                  Math.ceil((geminiUsage.rateLimitedUntil - currentTime) / 1000),
                )}
                s. Basic (non-AI) descriptions are being used until then.
              </p>
            )}
            <p className="hint">{t("geminiEstimateHint")}</p>
          </>
        ) : (
          <p className="hint">{t("geminiNoRequests")}</p>
        )}
      </section>

      {/* Image description language */}
      <section className="field">
        <label htmlFor="speech-lang">{t("imageDescLangLabel")}</label>
        <select
          id="speech-lang"
          value={settings.speechLang}
          onChange={(e) => updateSpeechLang(e.target.value)}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
        <p className="hint">{t("imageDescLangHint")}</p>
      </section>

      {/* Narrator voice */}
      <section className="field">
        <label htmlFor="narrator-voice">{t("voiceLabel")}</label>
        <select
          id="narrator-voice"
          value={settings.forcedVoiceName}
          onChange={(e) => updateForcedVoice(e.target.value)}
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

      {/* ElevenLabs */}
      <section className="field">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.useElevenLabs}
            onChange={(e) => updateUseElevenLabs(e.target.checked)}
          />
          {t("useElevenLabsLabel")}
        </label>

        <label htmlFor="elevenlabs-key">{t("elevenLabsKeyLabel")}</label>
        <input
          id="elevenlabs-key"
          type="password"
          value={settings.elevenLabsKey}
          onChange={(e) => patch({ elevenLabsKey: e.target.value })}
          placeholder={t("elevenLabsKeyPlaceholder")}
        />
        <div className="field-actions">
          <button type="button" className="secondary" onClick={saveElevenLabsKey}>
            {t("saveKeyButton")}
          </button>
          {settings.elevenLabsSavedKey && (
            <span className="saved-badge">{t("savedBadge")}</span>
          )}
        </div>

        <label htmlFor="elevenlabs-voice-id">{t("elevenLabsVoiceLabel")}</label>
        {elevenLabs.voices.length > 0 ? (
          <select
            id="elevenlabs-voice-id"
            value={settings.elevenLabsVoiceId}
            onChange={(e) => updateElevenLabsVoiceId(e.target.value)}
          >
            {elevenLabs.voices.map((voice) => (
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
            value={settings.elevenLabsVoiceId}
            onChange={(e) => updateElevenLabsVoiceId(e.target.value)}
            placeholder={t("elevenLabsVoicePlaceholder")}
          />
        )}
        <div className="field-actions">
          <button
            type="button"
            className="secondary"
            onClick={() =>
              elevenLabs.refreshVoices(
                settings.elevenLabsKey,
                settings.elevenLabsVoiceId,
                updateElevenLabsVoiceId,
              )
            }
          >
            {t("refreshVoicesButton")}
          </button>
        </div>
        {elevenLabs.voicesError && (
          <p className="error">{elevenLabs.voicesError}</p>
        )}
        <p className="hint">{t("elevenLabsHint")}</p>

        <div className="field-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => elevenLabs.refreshUsage(settings.elevenLabsKey)}
          >
            {t("refreshUsageButton")}
          </button>
        </div>
        {elevenLabs.usage && (
          <p className="hint">
            {elevenLabs.usage.used.toLocaleString()} /{" "}
            {elevenLabs.usage.limit.toLocaleString()} characters used
          </p>
        )}
        {elevenLabs.usageError && (
          <p className="error">{elevenLabs.usageError}</p>
        )}
        <p className="hint">{t("quotaHint")}</p>
      </section>

      {/* Speech rate */}
      <section className="field">
        <div className="speed-header">
          <label htmlFor="speech-rate">{t("speechRateLabel")}</label>
          <strong aria-live="polite">
            {formatSpeechRate(settings.speechRate)}x
          </strong>
        </div>
        <input
          id="speech-rate"
          type="range"
          min={SPEECH_RATE_MIN}
          max={SPEECH_RATE_MAX}
          step={SPEECH_RATE_STEP}
          value={settings.speechRate}
          onChange={(e) => updateSpeechRate(Number(e.target.value))}
          aria-valuemin={SPEECH_RATE_MIN}
          aria-valuemax={SPEECH_RATE_MAX}
          aria-valuenow={settings.speechRate}
          aria-valuetext={`${formatSpeechRate(settings.speechRate)} times normal speed`}
        />
        <p className="hint">{t("speechRateHint")}</p>
      </section>

      {/* AI toggle */}
      <section className="field">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.aiEnabled}
            onChange={(e) => setAiConfig(e.target.checked)}
          />
          {t("useAiLabel")}
        </label>
        <p className="hint">{t("useAiHint")}</p>
      </section>

      {/* Gemini API key */}
      <section className="field">
        <label htmlFor="api-key">{t("geminiKeyLabel")}</label>
        <input
          id="api-key"
          type="password"
          value={settings.apiKey}
          onChange={(e) => patch({ apiKey: e.target.value })}
          placeholder={t("geminiKeyPlaceholder")}
        />
        <div className="field-actions">
          <button type="button" className="secondary" onClick={saveApiKey}>
            {t("saveGeminiKeyButton")}
          </button>
          {settings.hasSavedKey && (
            <span className="saved-badge">{t("savedBadge")}</span>
          )}
        </div>
      </section>

      {error && <p className="error">{error}</p>}
    </main>
  );
}

export default App;
