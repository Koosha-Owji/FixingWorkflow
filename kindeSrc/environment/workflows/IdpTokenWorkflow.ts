import {
  onTokensGenerationEvent,
  WorkflowSettings,
  WorkflowTrigger,
  accessTokenCustomClaims,
  idTokenCustomClaims,
} from "@kinde/infrastructure";

/**
 * Add IdP Claims to Tokens Workflow
 * 
 * This workflow reads IdP claims that were captured during Post Authentication
 * (stored in the `idp_claims` user property) and adds them to the access and ID tokens.
 * 
 * This workflow works in conjunction with the CaptureIdpClaimsWorkflow:
 * 1. CaptureIdpClaimsWorkflow (PostAuthentication) - captures IdP claims and stores them
 * 2. This workflow (TokensGeneration) - reads stored claims and adds them to tokens
 * 
 * Benefits:
 * - Automatically includes ALL IdP claims in tokens (no hardcoding needed)
 * - Claims persist across token refreshes
 * - Easy to customize which claims go into which tokens
 * 
 * Setup:
 * 1. Deploy the CaptureIdpClaimsWorkflow first (PostAuthentication trigger)
 * 2. Deploy this workflow (TokensGeneration trigger)
 * 3. Authenticate with a social provider
 * 4. Your tokens will include all captured IdP claims
 * 
 * Note: This workflow runs on EVERY token generation, not just initial authentication.
 * The claims are read from the user's stored properties.
 */

export const workflowSettings: WorkflowSettings = {
  id: "tokensGeneration",
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
  // Access user properties - these were set by the CaptureIdpClaimsWorkflow
  const userProperties = event.user?.properties;

  if (!userProperties) {
    console.log("No user properties available");
    return;
  }

  // Check if the idp_claims property exists
  if (!userProperties.idp_claims) {
    console.log("No idp_claims property found - user may not have authenticated via IdP");
    return;
  }

  // Parse the JSON from the idp_claims property
  let idpClaims: Record<string, any>;
  try {
    idpClaims = JSON.parse(userProperties.idp_claims as string);
    console.log(`Parsed IdP claims from property: ${Object.keys(idpClaims).length} claims found`);
  } catch (error) {
    console.error("Failed to parse idp_claims property:", error);
    return;
  }

  // Use Record<string, any> to allow dynamic property assignment
  const accessToken = accessTokenCustomClaims<Record<string, any>>();
  const idToken = idTokenCustomClaims<Record<string, any>>();

  // Add ALL IdP claims to tokens with "idp_" prefix
  // Skip metadata fields (those starting with "_")
  let claimsAdded = 0;
  
  for (const [claimName, claimValue] of Object.entries(idpClaims)) {
    // Skip metadata fields
    if (claimName.startsWith('_')) {
      continue;
    }

    // Add to both access and ID tokens with "idp_" prefix
    const tokenClaimName = `idp_${claimName}`;
    
    accessToken[tokenClaimName] = claimValue;
    idToken[tokenClaimName] = claimValue;
    
    claimsAdded++;
  }

  console.log(`✓ Added ${claimsAdded} IdP claims to tokens`);
  console.log(`Claims added: ${Object.keys(idpClaims).filter(k => !k.startsWith('_')).join(', ')}`);

  // Optionally log provider info from metadata
  if (idpClaims._provider) {
    console.log(`Provider: ${idpClaims._provider}, Last updated: ${idpClaims._last_updated}`);
  }
}
