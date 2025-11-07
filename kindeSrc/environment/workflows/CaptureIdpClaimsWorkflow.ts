/**
 * Capture All IdP Claims in Single Property
 * 
 * This workflow captures ALL claims from social identity providers
 * and stores them in a single multi-line property as JSON.
 * 
 * Benefits:
 * - Only need to create ONE property instead of many
 * - Easier to manage and update
 * - Preserves the original structure of IdP claims
 * - More flexible for future changes
 * 
 * Setup:
 * 1. Create a Machine-to-Machine (M2M) app in Kinde with these scopes:
 *    - read:properties
 *    - create:properties  
 *    - update:user_properties
 * 
 * 2. Add these environment variables to your workflow:
 *    - KINDE_WF_M2M_CLIENT_ID
 *    - KINDE_WF_M2M_CLIENT_SECRET (mark as sensitive)
 * 
 * Trigger: user:post_authentication
 */

import {
  WorkflowSettings,
  WorkflowTrigger,
  createKindeAPI,
} from "@kinde/infrastructure";

export const workflowSettings: WorkflowSettings = {
  id: "captureIdpClaimsJson",
  name: "Capture IdP Claims as JSON",
  failurePolicy: {
    action: "stop",
  },
  trigger: WorkflowTrigger.PostAuthentication,
  bindings: {
    "kinde.env": {},
    "url": {}
  },
};

export default async function captureIdpClaimsWorkflow(event: any) {
  const provider = event.context?.auth?.provider;
  
  // Only process OAuth2/OIDC social connections
  if (!provider || provider.protocol !== "oauth2") {
    console.log("Not an OAuth2 authentication, skipping");
    return;
  }

  const idTokenClaims = provider.data?.idToken?.claims;
  
  if (!idTokenClaims) {
    console.log("No ID token claims available");
    return;
  }

  const userId = event.context?.user?.id;
  
  if (!userId) {
    console.error("User ID is missing from event context");
    throw new Error("User ID is required");
  }

  console.log(`Processing IdP claims for user: ${userId} from provider: ${provider.provider}`);

  // Create the Kinde API client
  const kindeAPI = await createKindeAPI(event);

  const PROPERTY_CATEGORY_ID = "cat_019707b6768049671d26e30a413ea29b";
  const IDP_CLAIMS_PROPERTY_KEY = "idp_claims";

  // Step 1: Check if the idp_claims property exists
  let propertyExists = false;
  
  try {
    const propertiesResponse = await kindeAPI.get({
      endpoint: 'properties',
      params: {
        context: 'usr', // Filter for user properties only
      },
    });
    
    propertyExists = (propertiesResponse.properties || []).some(
      (prop: any) => prop.key === IDP_CLAIMS_PROPERTY_KEY
    );
    
    console.log(`Property '${IDP_CLAIMS_PROPERTY_KEY}' exists: ${propertyExists}`);
  } catch (error) {
    console.error("Error fetching existing properties:", error);
    throw error;
  }

  // Step 2: Create the property if it doesn't exist
  if (!propertyExists) {
    console.log(`Creating property '${IDP_CLAIMS_PROPERTY_KEY}'...`);
    
    try {
      await kindeAPI.post({
        endpoint: 'properties',
        params: {
          key: IDP_CLAIMS_PROPERTY_KEY,
          name: "IdP Claims",
          description: "All claims from the identity provider stored as JSON",
          type: 'multi_line_text',
          context: 'usr',
          is_private: false, // Can be included in tokens if needed
          category_id: PROPERTY_CATEGORY_ID,
        },
      });
      
      console.log(`✓ Created property: ${IDP_CLAIMS_PROPERTY_KEY}`);
    } catch (error: any) {
      console.error(`Failed to create property '${IDP_CLAIMS_PROPERTY_KEY}':`, error?.message || error);
      throw error;
    }
  }

  // Step 3: Filter out standard JWT claims we don't want to store
  const standardClaims = new Set([
    'iss', 'aud', 'exp', 'iat', 'nbf', 'jti', 'azp', 'nonce', 
    'auth_time', 'at_hash', 'c_hash'
  ]);
  
  const claimsToStore: Record<string, any> = {};
  
  for (const [claimName, claimValue] of Object.entries(idTokenClaims)) {
    if (!standardClaims.has(claimName) && claimValue !== null && claimValue !== undefined) {
      claimsToStore[claimName] = claimValue;
    }
  }

  // Step 4: Add metadata
  claimsToStore._provider = provider.provider;
  claimsToStore._last_updated = new Date().toISOString();

  console.log(`Storing ${Object.keys(claimsToStore).length} claims from IdP`);

  // Step 5: Convert to JSON and update the user property
  const claimsJson = JSON.stringify(claimsToStore, null, 2); // Pretty-printed for readability

  try {
    await kindeAPI.patch({
      endpoint: `users/${userId}/properties`,
      params: { 
        properties: {
          [IDP_CLAIMS_PROPERTY_KEY]: claimsJson
        }
      },
    });

    console.log(`✓ Successfully stored IdP claims for user ${userId}`);
    console.log(`Claims stored: ${Object.keys(claimsToStore).join(', ')}`);
  } catch (error: any) {
    console.error("Error updating user properties:", error?.message || error);
    throw error;
  }

  console.log(`✅ Completed IdP claims capture for user ${userId}`);
}

