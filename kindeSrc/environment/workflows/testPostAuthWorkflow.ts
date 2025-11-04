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
    
    console.log("--- Deep Exploration of IdP Tokens ---");
    
    const idToken = provider.data?.idToken;
    const accessToken = provider.data?.accessToken;
    
    if (idToken) {
      console.log("IdToken object:", idToken);
      console.log("IdToken constructor:", idToken.constructor?.name);
      console.log("IdToken keys (Object.keys):", Object.keys(idToken));
      console.log("IdToken keys (Object.getOwnPropertyNames):", Object.getOwnPropertyNames(idToken));
      console.log("IdToken keys (Object.getOwnPropertyDescriptors):", Object.keys(Object.getOwnPropertyDescriptors(idToken)));
      
      // Try to access common JWT properties
      console.log("--- Trying standard JWT structure ---");
      console.log("idToken['header']:", (idToken as any)['header']);
      console.log("idToken['payload']:", (idToken as any)['payload']);
      console.log("idToken['claims']:", (idToken as any)['claims']);
      
      // Check prototype chain
      console.log("--- Prototype exploration ---");
      const proto = Object.getPrototypeOf(idToken);
      console.log("Prototype:", proto);
      console.log("Prototype keys:", Object.keys(proto));
      console.log("Prototype own property names:", Object.getOwnPropertyNames(proto));
      
      // Try direct property access for common GitHub OAuth claims
      console.log("--- Direct property access ---");
      const props = ['sub', 'email', 'name', 'login', 'avatar_url', 'html_url', 'bio', 'company'];
      props.forEach(prop => {
        const val = (idToken as any)[prop];
        if (val !== undefined) {
          console.log(`idToken.${prop}:`, val);
        }
      });
      
      // Check if it's a function or has methods
      console.log("--- Checking for methods ---");
      if (typeof (idToken as any).getClaim === 'function') {
        console.log("idToken.getClaim is a function!");
        console.log("Try: idToken.getClaim('email')");
      }
      if (typeof (idToken as any).get === 'function') {
        console.log("idToken.get is a function!");
      }
      if (typeof (idToken as any).getAll === 'function') {
        console.log("idToken.getAll is a function!");
      }
    }
    
    console.log("--- Access Token ---");
    if (accessToken) {
      console.log("AccessToken object:", accessToken);
      console.log("AccessToken keys:", Object.keys(accessToken));
      console.log("AccessToken own property names:", Object.getOwnPropertyNames(accessToken));
    }
    
  } else {
    console.log("❌ Provider data not available");
  }
}

