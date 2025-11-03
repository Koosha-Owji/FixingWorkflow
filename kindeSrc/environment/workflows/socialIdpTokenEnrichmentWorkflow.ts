import {
  onUserTokenGeneratedEvent,
  WorkflowSettings,
  WorkflowTrigger,
  accessTokenCustomClaims,
  idTokenCustomClaims,
  getEnvironmentVariable,
  fetch,
} from "@kinde/infrastructure";

/**
 * Social Connection Token Enrichment Workflow
 * 
 * This workflow uses the Kinde Management API to fetch connection details
 * and adds custom claims to tokens based on the authentication method used.
 * 
 * SETUP REQUIRED:
 * Create an M2M application with the following scope enabled:
 * - read:connections
 * 
 * In Settings -> Environment variables, set up the following:
 * - KINDE_WF_ISSUER_URL (e.g., https://yourdomain.kinde.com)
 * - KINDE_WF_M2M_CLIENT_ID (from M2M app)
 * - KINDE_WF_M2M_CLIENT_SECRET (from M2M app, mark as sensitive)
 */

export const workflowSettings: WorkflowSettings = {
  id: "onUserTokenGeneration",
  trigger: WorkflowTrigger.UserTokenGeneration,
  failurePolicy: {
    action: "stop",
  },
  bindings: {
    "kinde.accessToken": {}, // Required for modifying access tokens
    "kinde.idToken": {},     // Required for modifying ID tokens
    "kinde.fetch": {},       // Required for Management API calls
    "kinde.env": {},         // Required to access environment variables
  },
};

interface AccessTokenCustomClaims {
  auth_provider: string;
  auth_connection_id: string;
  auth_connection_name: string;
  auth_strategy: string;
  auth_timestamp: string;
}

interface IdTokenCustomClaims {
  auth_provider: string;
  auth_connection_name: string;
}

async function createKindeAPI(event: onUserTokenGeneratedEvent) {
  const issuerUrl = getEnvironmentVariable("KINDE_WF_ISSUER_URL")?.value;
  const clientId = getEnvironmentVariable("KINDE_WF_M2M_CLIENT_ID")?.value;
  const clientSecret = getEnvironmentVariable("KINDE_WF_M2M_CLIENT_SECRET")?.value;

  const tokenUrl = `${issuerUrl}/oauth2/token`;
  const tokenBody = `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}&audience=${issuerUrl}/api`;

  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: tokenBody,
    responseFormat: "json",
  });

  const accessToken = tokenResponse.data.access_token;
  console.log("✓ Management API access token obtained");

  return {
    get: async ({ endpoint }: { endpoint: string }) => {
      console.log(`Making GET request to: ${issuerUrl}/api/v1/${endpoint}`);
      const response = await fetch(`${issuerUrl}/api/v1/${endpoint}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        responseFormat: "json",
      });
      console.log(`GET ${endpoint} response:`, JSON.stringify(response, null, 2));
      return { data: response };
    },
  };
}

export default async function Workflow(event: onUserTokenGeneratedEvent) {
  console.log("=== Social IdP Token Enrichment Workflow Started ===");

  const connectionId = event.context.auth.connectionId;
  console.log("Connection ID:", connectionId);

  try {
    // Create Kinde API instance
    console.log("Creating Kinde Management API instance...");
    const kindeAPI = await createKindeAPI(event);

    // Fetch connection details
    console.log("Fetching connection details...");
    const { data: connectionResponse } = await kindeAPI.get({
      endpoint: `connections/${connectionId}`,
    });

    const connection = connectionResponse.data.connection;
    console.log("Connection details retrieved:");
    console.log("- Name:", connection.name);
    console.log("- Display Name:", connection.display_name);
    console.log("- Strategy:", connection.strategy);

    // Initialize type-safe token claim objects
    const accessToken = accessTokenCustomClaims<AccessTokenCustomClaims>();
    const idToken = idTokenCustomClaims<IdTokenCustomClaims>();

    // Add custom claims to tokens
    accessToken.auth_provider = connection.strategy;
    accessToken.auth_connection_id = connection.id;
    accessToken.auth_connection_name = connection.display_name || connection.name;
    accessToken.auth_strategy = connection.strategy;
    accessToken.auth_timestamp = new Date().toISOString();

    idToken.auth_provider = connection.strategy;
    idToken.auth_connection_name = connection.display_name || connection.name;

    console.log("✅ Successfully added custom claims to tokens");
    console.log("Provider/Strategy:", connection.strategy);
    console.log("Connection Name:", connection.display_name || connection.name);

  } catch (error) {
    console.error("❌ Error enriching tokens:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    // Don't throw - we don't want to break authentication if enrichment fails
  }
}
