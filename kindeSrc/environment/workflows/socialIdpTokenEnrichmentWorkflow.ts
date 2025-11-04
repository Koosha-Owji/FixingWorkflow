import {
  onUserTokenGeneratedEvent,
  WorkflowSettings,
  WorkflowTrigger,
  accessTokenCustomClaims,
  idTokenCustomClaims,
  getEnvironmentVariable,
  fetch,
} from "@kinde/infrastructure";

// This workflow uses the Kinde Management API to fetch connection details
// and adds custom claims to tokens based on the authentication method used.
//
// This workflow requires you to set up the Kinde management API
// You can do this by going to the Kinde dashboard.
//
// Create an M2M application with the following scope enabled:
// * read:connections
//
// In Settings -> Environment variables set up the following variables with the
// values from the M2M application you created above:
//
// * KINDE_WF_ISSUER_URL - Your Kinde domain (e.g., https://yourdomain.kinde.com)
// * KINDE_WF_M2M_CLIENT_ID
// * KINDE_WF_M2M_CLIENT_SECRET - Ensure this is setup with sensitive flag
// enabled to prevent accidental sharing

// The setting for this workflow
export const workflowSettings: WorkflowSettings = {
  id: "onUserTokenGeneration",
  trigger: WorkflowTrigger.UserTokenGeneration,
  failurePolicy: {
    action: "stop",
  },
  bindings: {
    "kinde.accessToken": {}, // Required for modifying access tokens
    "kinde.idToken": {}, // Required for modifying ID tokens
    "kinde.fetch": {}, // Required for management API calls
    "kinde.env": {}, // Required to access your environment variables
  },
};

// Helper function to create a Kinde Management API client
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

  return {
    get: async ({ endpoint }: { endpoint: string }) => {
      const response = await fetch(`${issuerUrl}/api/v1/${endpoint}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        responseFormat: "json",
      });
      return { data: response };
    },
  };
}

// The workflow code to be executed when the event is triggered
export default async function Workflow(event: onUserTokenGeneratedEvent) {
  const connectionId = event.context.auth.connectionId;

  try {
    // Create Kinde API instance
    const kindeAPI = await createKindeAPI(event);

    // Fetch connection details from the Management API
    const { data: connectionResponse } = await kindeAPI.get({
      endpoint: `connections/${connectionId}`,
    });

    const connection = connectionResponse.data.connection;

    // Set the types for the custom claims
    const accessToken = accessTokenCustomClaims<{
      auth_provider: string;
      auth_connection_id: string;
      auth_connection_name: string;
      auth_strategy: string;
      auth_timestamp: string;
    }>();

    const idToken = idTokenCustomClaims<{
      auth_provider: string;
      auth_connection_name: string;
    }>();

    // Add custom claims to the access token
    accessToken.auth_provider = connection.strategy;
    accessToken.auth_connection_id = connection.id;
    accessToken.auth_connection_name = connection.display_name || connection.name;
    accessToken.auth_strategy = connection.strategy;
    accessToken.auth_timestamp = new Date().toISOString();

    // Add custom claims to the ID token
    idToken.auth_provider = connection.strategy;
    idToken.auth_connection_name = connection.display_name || connection.name;

  } catch (error) {
    console.error("error", error);
  }
}
