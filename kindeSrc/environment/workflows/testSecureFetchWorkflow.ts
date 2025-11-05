import {
  onUserTokenGeneratedEvent,
  WorkflowSettings,
  WorkflowTrigger,
  secureFetch,
} from "@kinde/infrastructure";

// Test workflow to capture encrypted payload from secureFetch

export const workflowSettings: WorkflowSettings = {
  id: "onUserTokenGeneration",
  trigger: WorkflowTrigger.UserTokenGeneration,
  failurePolicy: {
    action: "stop",
  },
  bindings: {
    "kinde.secureFetch": {},
    url: {}, // Required for secureFetch to work
  },
};

export default async function Workflow(event: onUserTokenGeneratedEvent) {
  console.log("=== Testing secureFetch Encryption ===");
  
  const testPayload = {
    message: "Hello World",
    userId: event.context.user.id,
    timestamp: new Date().toISOString(),
  };
  
  console.log("Original payload:", JSON.stringify(testPayload));
  
  const url = "https://webhook.site/83202388-16b8-4fcf-9a28-cbbfdd71800e";
  
  try {
    console.log("Sending to:", url);
    
    const {data: result} = await secureFetch(url, {
      method: "POST",
      responseFormat: "json",
      headers: {
        "content-type": "application/json",
      },
      body: testPayload,
    });
    
    console.log("✅ secureFetch successful:", result);
  } catch (error) {
    console.error("❌ secureFetch error:", error);
    console.error("Error type:", typeof error);
    console.error("Error constructor:", error?.constructor?.name);
    console.error("Error details:", JSON.stringify(error, null, 2));
    
    // Try accessing error in different ways
    if (error && typeof error === 'object') {
      console.error("Error keys:", Object.keys(error));
      console.error("Error.value:", (error as any).value);
      console.error("Error.message:", (error as any).message);
      
      // Check if error.value has the actual error
      if ((error as any).value) {
        console.error("Error.value keys:", Object.keys((error as any).value));
        console.error("Error.value.message:", (error as any).value?.message);
      }
    }
  }
}

