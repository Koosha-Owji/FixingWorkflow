/**
 * Add IdP Claims to Tokens Workflow
 * 
 * This workflow reads the IdP claims stored in the user's `idp_claims` property
 * (populated by the CaptureIdpClaimsWorkflow) and adds them to the access token
 * and ID token.
 * 
 * The workflow dynamically adds ALL claims from the IdP, making it fully automated.
 * When new claims are added to your IdP, they will automatically flow through to tokens.
 * 
 * Benefits:
 * - Fully dynamic - no hardcoding of claim names
 * - Works with any OAuth2/OIDC provider (Google, Microsoft, etc.)
 * - Easy to customize which claims go to which tokens
 * 
 * Setup:
 * 1. This workflow works in conjunction with CaptureIdpClaimsWorkflow
 * 2. No additional setup required - just deploy!
 * 
 * Trigger: user:tokens_generation
 */

import {
  onTokensGenerationEvent,
  WorkflowSettings,
  WorkflowTrigger,
  accessTokenCustomClaims,
  idTokenCustomClaims,
  createKindeAPI,
} from "@kinde/infrastructure";

export const workflowSettings: WorkflowSettings = {
  id: "addIdpClaimsToTokens",
  name: "Add IdP Claims to Tokens",
  trigger: WorkflowTrigger.UserTokenGeneration,
  failurePolicy: {
    action: "stop",
  },
  bindings: {
    "kinde.accessToken": {
      audience: [],
    },
    "kinde.idToken": {},
  },
};

export default async function handleTokensGeneration(event: onTokensGenerationEvent) {
  // Log the entire event structure to see what's available
  console.log("=== Token Generation Event Structure ===");
  console.log("Event keys:", Object.keys(event));
  console.log("Event.context keys:", event.context ? Object.keys(event.context) : "no context");
  console.log("Event.user:", JSON.stringify(event.user, null, 2));
  
  // Access user properties directly from the event
  const userProperties = event.user?.properties;

  console.log("User properties available:", !!userProperties);
  if (userProperties) {
    console.log("User property keys:", Object.keys(userProperties));
  }

  if (!userProperties) {
    console.log("❌ No user properties available - may need to use API call");
    return;
  }

  // Check if the idp_claims property exists
  if (!userProperties.idp_claims) {
    console.log("❌ No IdP claims found in user properties");
    console.log("Available properties:", Object.keys(userProperties).join(', '));
    return;
  }
  
  console.log("✓ Found idp_claims property");

  // Parse the JSON stored in the idp_claims property
  let idpClaims: Record<string, any>;
  try {
    idpClaims = JSON.parse(userProperties.idp_claims as string);
    console.log(`Parsed IdP claims from ${idpClaims._provider || 'unknown provider'}`);
  } catch (error) {
    console.error("Failed to parse IdP claims JSON:", error);
    return;
  }

  // Initialize token claim objects with dynamic typing
  const accessToken = accessTokenCustomClaims<Record<string, any>>();
  const idToken = idTokenCustomClaims<Record<string, any>>();

  // Track how many claims we add
  let accessTokenClaimsAdded = 0;
  let idTokenClaimsAdded = 0;

  // Loop through all IdP claims and add them to tokens
  for (const [claimName, claimValue] of Object.entries(idpClaims)) {
    // Skip metadata properties (those starting with underscore)
    if (claimName.startsWith('_')) {
      continue;
    }

    // Add to access token with idp_ prefix to avoid conflicts with standard claims
    accessToken[`idp_${claimName}`] = claimValue;
    accessTokenClaimsAdded++;

    // For ID token, you might want to be more selective
    // Add only user-profile related claims to ID token
    const idTokenClaims = new Set([
      'email', 'name', 'given_name', 'family_name', 
      'picture', 'preferred_username', 'sub', 'oid'
    ]);

    if (idTokenClaims.has(claimName)) {
      idToken[`idp_${claimName}`] = claimValue;
      idTokenClaimsAdded++;
    }
  }

  console.log(`✓ Added ${accessTokenClaimsAdded} IdP claims to access token`);
  console.log(`✓ Added ${idTokenClaimsAdded} IdP claims to ID token`);

  // Optional: Add provider metadata to tokens for debugging/tracking
  if (idpClaims._provider) {
    accessToken.idp_provider = idpClaims._provider;
    idToken.idp_provider = idpClaims._provider;
    console.log(`✓ Added provider metadata: ${idpClaims._provider}`);
  }
}

