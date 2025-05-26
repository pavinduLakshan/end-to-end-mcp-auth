import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import {
  type OAuthClientInformation,
  type OAuthTokens,
  type OAuthClientMetadata,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { AsgardeoSPAClient } from "@asgardeo/auth-react";
import { decodeJwt } from 'jose';

// OAuth-related session storage keys
export const SESSION_KEYS = {
  CODE_VERIFIER: "mcp_code_verifier",
  SERVER_URL: "mcp_server_url",
  TOKENS: "mcp_tokens",
  CLIENT_INFORMATION: "mcp_client_information",
  SERVER_METADATA: "mcp_server_metadata",
} as const;

// Generate server-specific session storage keys
export const getServerSpecificKey = (
  baseKey: string,
  serverUrl?: string
): string => {
  if (!serverUrl) return baseKey;
  return `[${serverUrl}] ${baseKey}`;
};

export class McpClientOAuthProvider implements OAuthClientProvider {
  serverUrl: string;

  constructor(serverUrl: string) {
    // Save the server URL to session storage
    this.serverUrl = serverUrl;
    sessionStorage.setItem(SESSION_KEYS.SERVER_URL, serverUrl);
  }

  get redirectUrl() {
    return window.location.origin;
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      redirect_uris: [this.redirectUrl],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      client_name: "PetVet Assistant",
      client_uri: "https://petvet-assistant.example.com",
    };
  }

  clientInformation() {
    return {
      client_id: "iYt9lvROrGJ_0E2M5gSqNp5PjEUa",
    };
  }

  saveClientInformation(clientInformation: OAuthClientInformation) {
    const key = getServerSpecificKey(
      SESSION_KEYS.CLIENT_INFORMATION,
      this.serverUrl
    );
    sessionStorage.setItem(key, JSON.stringify(clientInformation));
  }

  async tokens() {
    try {
      const accessToken =
        await AsgardeoSPAClient.getInstance()?.getAccessToken();
      if (!accessToken) {
        console.error("No access token available");
        return undefined;
      }

      const decoded = decodeJwt(accessToken);

      return {
        access_token: accessToken,
        token_type: "bearer",
        expires_in: decoded.exp,
        scope: typeof decoded.scope === "string" ? decoded.scope : "",
        refresh_token: "",
      };
    } catch (err) {
      console.error("Error retrieving tokens:", err);
      return undefined;
    }
  }

  saveTokens(tokens: OAuthTokens) {
    const key = getServerSpecificKey(SESSION_KEYS.TOKENS, this.serverUrl);
    sessionStorage.setItem(key, JSON.stringify(tokens));
  }

  redirectToAuthorization(authorizationUrl: URL) {
    window.location.href = authorizationUrl.href;
  }

  saveCodeVerifier(codeVerifier: string) {
    const key = getServerSpecificKey(
      SESSION_KEYS.CODE_VERIFIER,
      this.serverUrl
    );
    sessionStorage.setItem(key, codeVerifier);
  }

  codeVerifier() {
    const key = getServerSpecificKey(
      SESSION_KEYS.CODE_VERIFIER,
      this.serverUrl
    );
    const verifier = sessionStorage.getItem(key);
    if (!verifier) {
      throw new Error("No code verifier saved for session");
    }

    return verifier;
  }

  clear() {
    sessionStorage.removeItem(
      getServerSpecificKey(SESSION_KEYS.CLIENT_INFORMATION, this.serverUrl)
    );
    sessionStorage.removeItem(
      getServerSpecificKey(SESSION_KEYS.TOKENS, this.serverUrl)
    );
    sessionStorage.removeItem(
      getServerSpecificKey(SESSION_KEYS.CODE_VERIFIER, this.serverUrl)
    );
  }
}
