import {
  onTokensGenerationEvent,
  WorkflowSettings,
  WorkflowTrigger,
  accessTokenCustomClaims,
  idTokenCustomClaims,
  createKindeAPI,
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
 * 1. Create a Machine-to-Machine (M2M) app in Kinde with this scope:
 *    - read:user_properties
 * 
 * 2. Add these environment variables to your workflow:
 *    - KINDE_WF_M2M_CLIENT_ID
 *    - KINDE_WF_M2M_CLIENT_SECRET (mark as sensitive)
 * 
 * 3. Deploy the CaptureIdpClaimsWorkflow first (PostAuthentication trigger)
 * 4. Deploy this workflow (TokensGeneration trigger)
 * 5. Authenticate with a social provider
 * 6. Your tokens will include all captured IdP claims
 * 
 * Note: This workflow runs on EVERY token generation, not just initial authentication.
 * The claims are read from the user's stored properties via Management API.
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
    "kinde.env": {},
    "url": {},
  },
};

export default async function handleTokensGeneration(event: onTokensGenerationEvent) {
  // Try to get user ID from different possible locations in the event
  const userId = event.user?.id || event.context?.user?.id || event.userId;

  if (!userId) {
    console.error("User ID is missing from event");
    console.log("Event structure:", JSON.stringify({
      hasUser: !!event.user,
      hasContext: !!event.context,
      contextUser: event.context?.user,
      userId: event.userId,
    }, null, 2));
    return;
  }

  console.log(`Fetching IdP claims for user: ${userId}`);

  // Create the Kinde API client to fetch user properties
  const kindeAPI = await createKindeAPI(event);

  // Fetch user properties via Management API
  let userProperties: Record<string, any> = {};
  
  try {
    const propertiesResponse = await kindeAPI.get({
      endpoint: `users/${userId}/properties`,
    });

    console.log("API Response:", JSON.stringify(propertiesResponse, null, 2));

    // Convert properties array to a key-value object
    if (propertiesResponse.properties && Array.isArray(propertiesResponse.properties)) {
      for (const prop of propertiesResponse.properties) {
        userProperties[prop.key] = prop.value;
      }
      console.log(`Fetched ${propertiesResponse.properties.length} user properties`);
      console.log(`Property keys: ${Object.keys(userProperties).join(', ')}`);
    } else {
      console.log("No properties array in response or not an array");
    }
  } catch (error: any) {
    console.error("Failed to fetch user properties:", error?.message || error);
    return;
  }

  // Check if the idp_claims property exists
  if (!userProperties.idp_claims) {
    console.log("No idp_claims property found - user may not have authenticated via IdP");
    console.log(`Available properties: ${JSON.stringify(Object.keys(userProperties))}`);
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
