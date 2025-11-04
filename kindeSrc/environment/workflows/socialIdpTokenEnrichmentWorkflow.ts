import {
  onUserTokenGeneratedEvent,
  WorkflowSettings,
  WorkflowTrigger,
} from "@kinde/infrastructure";

// Test workflow to check what data is available in user:tokens_generation trigger

export const workflowSettings: WorkflowSettings = {
  id: "onUserTokenGeneration",
  trigger: WorkflowTrigger.UserTokenGeneration,
  bindings: {
    "kinde.accessToken": {},
    "kinde.idToken": {},
  },
};

export default async function Workflow(event: onUserTokenGeneratedEvent) {
  console.log("=== User Token Generation Test ===");
  
  // Log full event
  console.log("Full event:", JSON.stringify(event, null, 2));
  
  // Log context
  console.log("--- event.context ---");
  console.log("context:", JSON.stringify(event.context, null, 2));
  
  // Log auth
  console.log("--- event.context.auth ---");
  console.log("auth:", JSON.stringify(event.context.auth, null, 2));
  
  // Check for provider
  const provider = event.context.auth.provider;
  console.log("--- Provider Check ---");
  console.log("Provider exists:", !!provider);
  
  if (provider) {
    console.log("✅ PROVIDER DATA AVAILABLE!");
    console.log("Provider:", JSON.stringify(provider, null, 2));
    console.log("Protocol:", provider.protocol);
    console.log("Provider name:", provider.provider);
    
    // Check for IdP token data
    const idToken = provider.data?.idToken;
    const accessToken = provider.data?.accessToken;
    
    console.log("--- IdP Token Data ---");
    console.log("idToken:", JSON.stringify(idToken, null, 2));
    console.log("accessToken:", JSON.stringify(accessToken, null, 2));
    
    if (idToken?.claims) {
      console.log("--- IdP ID Token Claims ---");
      console.log("All claims:", JSON.stringify(idToken.claims, null, 2));
      console.log("Email:", (idToken.claims as any).email);
      console.log("Name:", (idToken.claims as any).name);
      console.log("Picture:", (idToken.claims as any).picture);
      console.log("Email verified:", (idToken.claims as any).email_verified);
      console.log("Hosted domain (Google):", (idToken.claims as any).hd);
    }
    
  } else {
    console.log("❌ Provider data not available in tokens_generation trigger");
  }
  
  // Log request data
  console.log("--- event.request ---");
  console.log("request:", JSON.stringify(event.request, null, 2));
}
