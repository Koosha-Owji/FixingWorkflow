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
  
  // Log the entire event
  console.log("Full event:", JSON.stringify(event, null, 2));
  console.log("Full event.context:", JSON.stringify(event.context, null, 2));
  console.log("event.context.auth:", JSON.stringify(event.context.auth, null, 2));
  
  // Check for provider data
  const provider = event.context.auth.provider;
  
  console.log("Provider exists?:", !!provider);
  console.log("Provider:", JSON.stringify(provider, null, 2));
  
  if (provider) {
    console.log("✅ PROVIDER DATA FOUND!");
    console.log("Protocol:", provider.protocol);
    console.log("Provider name:", provider.provider);
    console.log("ID Token claims:", JSON.stringify(provider.data?.idToken?.claims, null, 2));
    console.log("Access Token claims:", JSON.stringify(provider.data?.accessToken?.claims, null, 2));
  } else {
    console.log("❌ Provider data not available in post-authentication trigger either");
  }
}

