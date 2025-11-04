import {
  onPostAuthenticationEvent,
  WorkflowSettings,
  WorkflowTrigger,
} from "@kinde/infrastructure";

// Test workflow to check if provider data is available in post-authentication trigger

export const workflowSettings: WorkflowSettings = {
  id: "postAuthentication",
  trigger: WorkflowTrigger.PostAuthentication,
  bindings: {},
};

export default async function Workflow(event: onPostAuthenticationEvent) {
  console.log("=== Post Authentication Test Workflow ===");
  
  const provider = event.context.auth.provider;
  
  if (provider) {
    console.log("✅ PROVIDER DATA FOUND!");
    console.log("Provider structure:", JSON.stringify(provider, null, 2));
    
    console.log("--- Exploring provider.data ---");
    const providerData = provider.data;
    console.log("provider.data exists:", !!providerData);
    console.log("provider.data type:", typeof providerData);
    console.log("provider.data keys:", providerData ? Object.keys(providerData) : "N/A");
    console.log("provider.data own property names:", providerData ? Object.getOwnPropertyNames(providerData) : "N/A");
    console.log("provider.data:", providerData);
    
    // Check if data might be at a different location
    console.log("--- Checking alternative locations ---");
    console.log("provider.idToken:", (provider as any).idToken);
    console.log("provider.accessToken:", (provider as any).accessToken);
    console.log("provider.tokens:", (provider as any).tokens);
    console.log("provider.claims:", (provider as any).claims);
    
    // Check all properties of provider
    console.log("--- All provider properties ---");
    console.log("provider keys:", Object.keys(provider));
    console.log("provider own property names:", Object.getOwnPropertyNames(provider));
    
    // Try to access with for...in loop to catch everything
    console.log("--- For...in loop through provider ---");
    for (const key in provider) {
      console.log(`provider[${key}]:`, (provider as any)[key]);
    }
    
    // Maybe GitHub doesn't return ID tokens?
    console.log("--- GitHub OAuth Note ---");
    console.log("GitHub OAuth typically returns:");
    console.log("- access_token (for API calls)");
    console.log("- But NO id_token (not an OIDC provider by default)");
    console.log("User info must be fetched from GitHub API using the access token");
    
  } else {
    console.log("❌ Provider data not available");
  }
}

