import {
  onPostAuthenticationEvent,
  WorkflowSettings,
  WorkflowTrigger,
  accessTokenCustomClaims,
  idTokenCustomClaims,
} from "@kinde/infrastructure";

// Test workflow to add custom claims from provider data in post-authentication

export const workflowSettings: WorkflowSettings = {
  id: "postAuthentication",
  trigger: WorkflowTrigger.PostAuthentication,
  bindings: {
    "kinde.accessToken": {}, // Try to enable token modification
    "kinde.idToken": {},
  },
};

export default async function Workflow(event: onPostAuthenticationEvent) {
  console.log("=== Testing Custom Claims in Post Authentication ===");
  
  const provider = event.context.auth.provider;
  
  if (!provider || provider.protocol !== "oauth2") {
    console.log("❌ Not an OAuth2 social connection");
    return;
  }
  
  console.log("✅ OAuth2 provider found:", provider.provider);
  
  try {
    // Try to initialize token claims
    console.log("--- Attempting to add custom claims ---");
    
    const accessToken = accessTokenCustomClaims<{
      idp_provider: string;
      idp_email: string;
      idp_picture: string;
    }>();
    
    const idToken = idTokenCustomClaims<{
      idp_provider: string;
      idp_picture: string;
    }>();
    
    const idTokenClaims = provider.data?.idToken?.claims;
    
    if (idTokenClaims) {
      console.log("IdP claims available!");
      
      // Try to add claims
      accessToken.idp_provider = provider.provider;
      accessToken.idp_email = idTokenClaims.email as string;
      accessToken.idp_picture = idTokenClaims.picture as string;
      
      idToken.idp_provider = provider.provider;
      idToken.idp_picture = idTokenClaims.picture as string;
      
      console.log("✅ Custom claims added successfully!");
      console.log("- idp_provider:", provider.provider);
      console.log("- idp_email:", idTokenClaims.email);
      console.log("- idp_picture:", idTokenClaims.picture);
    } else {
      console.log("⚠️ No IdP token claims available (expected for non-OIDC providers)");
    }
    
  } catch (error) {
    console.error("❌ Error adding custom claims:", error);
    console.error("This might mean token modification is not available in PostAuthentication trigger");
  }
}

