import { useCallback } from "react";
import { getUnsupportedTabMessage, wait } from "../tabSupport";

const chromeApi = (window as any).chrome;

export function useTabMessaging(onError: (msg: string) => void) {
  const getActiveTab = useCallback(
    (): Promise<any> =>
      new Promise((resolve, reject) => {
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
                new Error(
                  lastError.message || "Failed to query active tab.",
                ),
              );
              return;
            }
            resolve(tabs?.[0]);
          },
        );
      }),
    [],
  );

  const injectContentScript = useCallback(
    (tabId: number): Promise<void> => {
      if (!chromeApi?.scripting?.executeScript) {
        return Promise.reject(
          new Error("Script injection is unavailable in this browser."),
        );
      }

      return new Promise((resolve, reject) => {
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
    },
    [],
  );

  const sendToActiveTab = useCallback(
    async (message: any): Promise<any> => {
      onError("");
      const tab = await getActiveTab();

      if (!tab?.id || !chromeApi?.tabs?.sendMessage) {
        throw new Error("Unable to find active tab or send a message.");
      }

      const unsupportedMessage = getUnsupportedTabMessage(tab.url);
      if (unsupportedMessage) {
        throw new Error(unsupportedMessage);
      }

      const trySend = (): Promise<any> =>
        new Promise((resolve, reject) => {
          chromeApi.tabs.sendMessage(tab.id, message, (response: any) => {
            const lastError = chromeApi.runtime?.lastError;
            if (lastError) {
              reject(
                new Error(lastError.message || "Failed to send message."),
              );
              return;
            }
            resolve(response);
          });
        });

      const isMissingReceiver = (err: any) =>
        err?.message?.includes("Receiving end does not exist") ||
        err?.message?.includes("Could not establish connection");

      try {
        return await trySend();
      } catch (err: any) {
        if (!isMissingReceiver(err)) throw err;

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
    },
    [getActiveTab, injectContentScript, onError],
  );

  return { sendToActiveTab };
}
