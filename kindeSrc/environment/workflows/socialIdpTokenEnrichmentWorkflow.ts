import {
  onUserTokenGeneratedEvent,
  WorkflowSettings,
  WorkflowTrigger,
  accessTokenCustomClaims,
  idTokenCustomClaims,
} from "@kinde/infrastructure";

/**
 * OAuth2 Social Connection Token Enrichment Workflow
 * 
 * This workflow extracts claims from social IdP tokens (Google, Microsoft, GitHub, etc.)
 * and adds them as custom claims to Kinde's ID and Access tokens.
 * 
 * Use cases:
 * - Preserve IdP-specific user identifiers
 * - Extract custom claims from social providers
 * - Track which social provider was used for authentication
 * - Add IdP profile data not captured by Kinde by default
 */

export const workflowSettings: WorkflowSettings = {
  id: "onUserTokenGenerated",
  trigger: WorkflowTrigger.UserTokensGeneration,
  bindings: {
    "kinde.accessToken": {}, // Required for modifying access tokens
    "kinde.idToken": {},     // Required for modifying ID tokens
  },
};

/**
 * Define the custom claims we want to add to tokens
 */
interface AccessTokenCustomClaims {
  idp_provider?: string;        // Which social provider was used (e.g., "google", "microsoft")
  idp_user_id?: string;         // The user's ID from the social provider
  idp_email_verified?: boolean; // Email verification status from IdP
  idp_custom_data?: any;        // Any custom claims from the IdP
}

interface IdTokenCustomClaims {
  idp_provider?: string;        // Which social provider was used
  idp_picture?: string;         // High-res profile picture URL from IdP
  idp_locale?: string;          // User's locale from IdP
}

export default async function Workflow(event: onUserTokenGeneratedEvent) {
  console.log("=== Social IdP Token Enrichment Workflow Started ===");
  
  const provider = event.context.auth.provider;

  // Log basic authentication context
  console.log("Auth origin:", event.context.auth.origin);
  console.log("Connection ID:", event.context.auth.connectionId);
  console.log("User ID:", event.context.user.id);

  // Only process if authentication came from an OAuth2 social connection
  if (!provider || provider.protocol !== "oauth2") {
    console.log("❌ Not an OAuth2 social connection, skipping token enrichment");
    console.log("Provider data:", JSON.stringify(provider, null, 2));
    return;
  }

  console.log("✅ OAuth2 social connection detected");
  console.log("Provider:", provider.provider);
  console.log("Protocol:", provider.protocol);

  // Initialize type-safe token claim objects
  const accessToken = accessTokenCustomClaims<AccessTokenCustomClaims>();
  const idToken = idTokenCustomClaims<IdTokenCustomClaims>();

  try {
    // Extract claims from the social IdP's ID token
    const idTokenClaims = provider.data?.idToken?.claims;
    const accessTokenClaims = provider.data?.accessToken?.claims;

    console.log("--- IdP Token Data ---");
    console.log("ID Token claims available:", !!idTokenClaims);
    console.log("Access Token claims available:", !!accessTokenClaims);

    // Log all available IdP ID token claims for debugging
    if (idTokenClaims) {
      console.log("Available IdP ID Token claims:", JSON.stringify(Object.keys(idTokenClaims), null, 2));
      console.log("Full IdP ID Token claims:", JSON.stringify(idTokenClaims, null, 2));
    }

    if (accessTokenClaims) {
      console.log("Available IdP Access Token claims:", JSON.stringify(Object.keys(accessTokenClaims), null, 2));
    }

    console.log("--- Adding Custom Claims ---");

    // 1. Add provider information
    accessToken.idp_provider = provider.provider;
    idToken.idp_provider = provider.provider;
    console.log("✓ Added idp_provider:", provider.provider);

    if (idTokenClaims) {
      // 2. Preserve the IdP's user identifier (sub claim from IdP, not Kinde's sub)
      if (idTokenClaims.sub) {
        accessToken.idp_user_id = idTokenClaims.sub as string;
        console.log("✓ Added idp_user_id (Access Token):", idTokenClaims.sub);
      }

      // 3. Add email verification status from IdP
      if (typeof idTokenClaims.email_verified === "boolean") {
        accessToken.idp_email_verified = idTokenClaims.email_verified;
        console.log("✓ Added idp_email_verified (Access Token):", idTokenClaims.email_verified);
      }

      // 4. Add high-resolution profile picture URL (IdP often has better quality)
      if (idTokenClaims.picture) {
        idToken.idp_picture = idTokenClaims.picture as string;
        console.log("✓ Added idp_picture (ID Token):", idTokenClaims.picture);
      }

      // 5. Add user's locale/language preference
      if (idTokenClaims.locale) {
        idToken.idp_locale = idTokenClaims.locale as string;
        console.log("✓ Added idp_locale (ID Token):", idTokenClaims.locale);
      }

      // 6. Extract provider-specific custom claims
      console.log("--- Provider-Specific Claims ---");
      
      // Example: Google Workspace might have custom claims like 'hd' (hosted domain)
      if (provider.provider === "google" && idTokenClaims.hd) {
        accessToken.idp_custom_data = {
          hosted_domain: idTokenClaims.hd,
        };
        console.log("✓ Google Workspace domain found:", idTokenClaims.hd);
      }

      // Example: Microsoft might have custom claims like 'tid' (tenant ID)
      if (provider.provider === "microsoft" && idTokenClaims.tid) {
        accessToken.idp_custom_data = {
          tenant_id: idTokenClaims.tid,
        };
        console.log("✓ Microsoft tenant ID found:", idTokenClaims.tid);
      }

      // Example: GitHub might have custom organization data
      if (provider.provider === "github" && idTokenClaims.organizations) {
        accessToken.idp_custom_data = {
          organizations: idTokenClaims.organizations,
        };
        console.log("✓ GitHub organizations found:", idTokenClaims.organizations);
      }
    }

    // 7. Extract data from access token claims if available
    if (accessTokenClaims) {
      console.log("--- IdP Access Token Claims Available ---");
      console.log("Access token claims:", JSON.stringify(accessTokenClaims, null, 2));
      // Some IdPs return access tokens as JWTs with additional claims
      // You can extract them here if needed
    }

    console.log("=== ✅ Successfully enriched tokens with IdP data ===");
  } catch (error) {
    console.error("=== ❌ Error enriching tokens with IdP data ===");
    console.error("Error details:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    // Don't throw - we don't want to break authentication if enrichment fails
  }
}

