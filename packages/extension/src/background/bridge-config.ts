type BridgeConfig = {
  port: number;
  authToken: string;
};

const BRIDGE_CONFIG_STORAGE_KEY = "bridge_http_config";

export async function getBridgeConfig(): Promise<BridgeConfig | null> {
  const stored = await chrome.storage.local.get(BRIDGE_CONFIG_STORAGE_KEY);
  return (stored[BRIDGE_CONFIG_STORAGE_KEY] as BridgeConfig | undefined) ?? null;
}

export async function setBridgeConfig(config: BridgeConfig): Promise<void> {
  await chrome.storage.local.set({
    [BRIDGE_CONFIG_STORAGE_KEY]: config,
  });
}

export async function clearBridgeConfig(): Promise<void> {
  await chrome.storage.local.remove(BRIDGE_CONFIG_STORAGE_KEY);
}
