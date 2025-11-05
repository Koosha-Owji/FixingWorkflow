import {
  onPostAuthenticationEvent,
  WorkflowSettings,
  WorkflowTrigger,
  secureFetch,
} from "@kinde/infrastructure";

// Test workflow to capture encrypted payload from secureFetch

export const workflowSettings: WorkflowSettings = {
  id: "postAuthentication",
  trigger: WorkflowTrigger.PostAuthentication,
  bindings: {
    "kinde.secureFetch": {},
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
  
  try {
    const url = "https://webhook.site/83202388-16b8-4fcf-9a28-cbbfdd71800e";
    
    console.log("Sending to:", url);
    
    await secureFetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: testPayload,
      responseFormat: "json",
    });
    
    console.log("✅ Payload sent successfully");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

