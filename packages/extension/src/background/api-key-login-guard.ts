export function assertApiKeyLoginExplicitlyConfirmed(input: {
  loginType: unknown;
  apiKey?: unknown;
  confirmed?: unknown;
}): void {
  if (input.loginType !== "apiKey") {
    return;
  }

  const hasInlineApiKey = typeof input.apiKey === "string" && input.apiKey.trim().length > 0;
  const confirmed = input.confirmed === true;
  if (hasInlineApiKey || confirmed) {
    return;
  }

  throw new Error("API-key mode requires explicit user confirmation before reusing a stored API key.");
}
