import { useState, useCallback } from "react";

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
}

export function useElevenLabsApi() {
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [voicesError, setVoicesError] = useState("");
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(
    null,
  );
  const [usageError, setUsageError] = useState("");

  const refreshUsage = useCallback(async (key: string) => {
    if (!key) {
      setUsageError("Add an ElevenLabs API key first.");
      return;
    }
    setUsageError("");
    try {
      const response = await fetch(
        "https://api.elevenlabs.io/v1/user/subscription",
        { headers: { "xi-api-key": key } },
      );
      if (!response.ok) {
        throw new Error(`ElevenLabs usage check failed (${response.status}).`);
      }
      const data = await response.json();
      setUsage({
        used: data.character_count ?? 0,
        limit: data.character_limit ?? 0,
      });
    } catch (err: any) {
      setUsageError(err.message || "Could not check ElevenLabs usage.");
    }
  }, []);

  const refreshVoices = useCallback(
    async (
      key: string,
      currentVoiceId: string,
      onVoiceAutoCorrect?: (newVoiceId: string) => void,
    ) => {
      if (!key) {
        setVoicesError("Add an ElevenLabs API key first.");
        return;
      }
      setVoicesError("");
      try {
        const response = await fetch("https://api.elevenlabs.io/v1/voices", {
          headers: { "xi-api-key": key },
        });
        if (!response.ok) {
          throw new Error(`Could not list voices (${response.status}).`);
        }
        const data = await response.json();
        const fetchedVoices: ElevenLabsVoice[] = Array.isArray(data.voices)
          ? data.voices
          : [];
        setVoices(fetchedVoices);

        // If the saved voice ID isn't in this account's list, it's likely a
        // library voice that the API can't use on a free plan — switch to the
        // first available voice.
        if (
          fetchedVoices.length > 0 &&
          !fetchedVoices.some((v) => v.voice_id === currentVoiceId)
        ) {
          onVoiceAutoCorrect?.(fetchedVoices[0].voice_id);
        }
      } catch (err: any) {
        setVoicesError(
          err.message || "Could not list ElevenLabs voices.",
        );
      }
    },
    [],
  );

  return {
    voices,
    voicesError,
    usage,
    usageError,
    refreshUsage,
    refreshVoices,
  };
}
