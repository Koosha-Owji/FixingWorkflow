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
    console.log("Protocol:", provider.protocol);
    console.log("Provider name:", provider.provider);
    console.log("Kinde Version:", provider.kindeVersion);
    
    console.log("--- Exploring IdP Token Structure ---");
    
    // Check idToken
    const idToken = provider.data?.idToken;
    console.log("idToken exists?:", !!idToken);
    console.log("idToken type:", typeof idToken);
    console.log("idToken keys:", idToken ? Object.keys(idToken) : "N/A");
    console.log("idToken full:", JSON.stringify(idToken, null, 2));
    
    // Check for claims at different levels
    if (idToken) {
      console.log("idToken.claims:", JSON.stringify((idToken as any).claims, null, 2));
      console.log("idToken.header:", JSON.stringify((idToken as any).header, null, 2));
      
      // Check if the idToken itself IS the claims object
      console.log("Possible claims in idToken:");
      console.log("- sub:", (idToken as any).sub);
      console.log("- email:", (idToken as any).email);
      console.log("- name:", (idToken as any).name);
      console.log("- picture:", (idToken as any).picture);
      console.log("- email_verified:", (idToken as any).email_verified);
    }
    
    // Check accessToken
    const accessToken = provider.data?.accessToken;
    console.log("--- Access Token ---");
    console.log("accessToken exists?:", !!accessToken);
    console.log("accessToken type:", typeof accessToken);
    console.log("accessToken keys:", accessToken ? Object.keys(accessToken) : "N/A");
    console.log("accessToken full:", JSON.stringify(accessToken, null, 2));
    
    if (accessToken) {
      console.log("accessToken.claims:", JSON.stringify((accessToken as any).claims, null, 2));
      console.log("accessToken.header:", JSON.stringify((accessToken as any).header, null, 2));
    }
    
  } else {
    console.log("❌ Provider data not available");
  }
}

