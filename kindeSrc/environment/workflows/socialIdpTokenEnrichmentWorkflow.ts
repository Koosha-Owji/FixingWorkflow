import {
  onUserTokenGeneratedEvent,
  WorkflowSettings,
  WorkflowTrigger,
  accessTokenCustomClaims,
  idTokenCustomClaims,
} from "@kinde/infrastructure";

/**
 * Social Connection Token Enrichment Workflow
 * 
 * This workflow adds custom claims to tokens when users authenticate via social connections.
 * For this example, we're assuming GitHub authentication.
 */

export const workflowSettings: WorkflowSettings = {
  id: "onUserTokenGeneration",
  trigger: WorkflowTrigger.UserTokenGeneration,
  failurePolicy: {
    action: "stop",
  },
  bindings: {
    "kinde.accessToken": {},
    "kinde.idToken": {},
  },
};

interface AccessTokenCustomClaims {
  auth_provider: string;
  auth_connection_id: string;
  auth_timestamp: string;
}

interface IdTokenCustomClaims {
  auth_provider: string;
}

export default async function Workflow(event: onUserTokenGeneratedEvent) {
  // Initialize type-safe token claim objects
  const accessToken = accessTokenCustomClaims<AccessTokenCustomClaims>();
  const idToken = idTokenCustomClaims<IdTokenCustomClaims>();

  // Add custom claims to tokens
  accessToken.auth_provider = "github";
  accessToken.auth_connection_id = event.context.auth.connectionId;
  accessToken.auth_timestamp = new Date().toISOString();

  idToken.auth_provider = "github";

  console.log("✅ Added custom claims to tokens");
  console.log("Provider: github");
  console.log("Connection ID:", event.context.auth.connectionId);
  console.log("Timestamp:", accessToken.auth_timestamp);
}
