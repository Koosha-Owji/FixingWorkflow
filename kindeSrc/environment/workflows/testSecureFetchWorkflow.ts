import {
  onPostAuthenticationEvent,
  WorkflowSettings,
  WorkflowTrigger,
  secureFetch,
  fetch,
} from "@kinde/infrastructure";

// Test workflow to capture encrypted payload from secureFetch

export const workflowSettings: WorkflowSettings = {
  id: "postAuthentication",
  trigger: WorkflowTrigger.PostAuthentication,
  bindings: {
    "kinde.secureFetch": {},
    "kinde.fetch": {},
  },
};

export default async function Workflow(event: onPostAuthenticationEvent) {
  console.log("=== Testing secureFetch Encryption ===");
  
  const testPayload = {
    message: "Hello World",
    userId: event.context.user.id,
    timestamp: new Date().toISOString(),
  };
  
  console.log("Original payload:", JSON.stringify(testPayload));
  
  const url = "https://webhook.site/83202388-16b8-4fcf-9a28-cbbfdd71800e";
  
  // First try regular fetch to see if the URL is reachable
  console.log("\n--- Testing regular fetch first ---");
  try {
    const result = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(testPayload),
      responseFormat: "text",
    });
    console.log("✅ Regular fetch successful:", result);
  } catch (error) {
    console.error("❌ Regular fetch error:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
  }
  
  // Now try secureFetch
  console.log("\n--- Testing secureFetch ---");
  try {
    const result = await secureFetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: testPayload,
      responseFormat: "json",
    });
    
    console.log("✅ secureFetch successful:", result);
  } catch (error) {
    console.error("❌ secureFetch error:", error);
    console.error("Error type:", typeof error);
    console.error("Error keys:", Object.keys(error || {}));
    console.error("Error details:", JSON.stringify(error, null, 2));
    
    // Check if it's an encryption key issue
    if (error && error.message) {
      console.error("Error message:", error.message);
    }
  }
}

