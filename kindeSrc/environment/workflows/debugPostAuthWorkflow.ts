import {
  onUserPostAuthenticationEvent,
  WorkflowSettings,
  WorkflowTrigger,
  fetch,
  getEnvironmentVariable,
} from "@kinde/infrastructure";

export const workflowSettings: WorkflowSettings = {
  id: "debugPostAuthWorkflow",
  name: "Debug Post Authentication Workflow",
  trigger: WorkflowTrigger.PostAuthentication,
  failurePolicy: { action: "stop" },
  bindings: {
    "kinde.auth": {},
    "kinde.fetch": {},
    "kinde.env": {},
  },
};

async function getUserWithOrganizations(userId: string) {
  try {
    // Check environment variable
    const tokenEnvVar = getEnvironmentVariable("KINDE_API_TOKEN");
    console.log("Environment variable check:", {
      exists: !!tokenEnvVar,
      isSecret: tokenEnvVar?.isSecret,
      hasValue: !!tokenEnvVar?.value,
      valueLength: tokenEnvVar?.value?.length || 0
    });
    
    const token = tokenEnvVar?.value || "";
    if (!token) {
      throw new Error("KINDE_API_TOKEN environment variable not found or empty");
    }
    
    const url = `/api/v1/user?id=${userId}&expand=organizations`;
    console.log("Making API call to:", url);
    console.log("Token length:", token.length);
    console.log("Token starts with:", token.substring(0, 20) + "...");

    const response = await fetch(url, {
      method: "GET",
      responseFormat: "json",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("=== FULL API RESPONSE ===");
    console.log("Response object:", JSON.stringify(response, null, 2));

    if (response.error) {
      console.error("API Error:", response.error);
      throw new Error(`API Error: ${JSON.stringify(response.error)}`);
    }

    if (!response.data) {
      console.error("No data in response");
      throw new Error("No data returned from API");
    }

    const userData = response.data;
    console.log("=== API SUCCESS: User data with organizations ===");
    console.log(JSON.stringify(userData, null, 2));
    return userData;
    
  } catch (error) {
    console.error("=== DETAILED ERROR INFO ===");
    console.error("Error type:", typeof error);
    console.error("Error constructor:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Full error object:", JSON.stringify(error, null, 2));
    console.error("Error stack:", error.stack);
    throw error;
  }
}

export default async function handlePostAuthentication(
  event: onUserPostAuthenticationEvent
) {
  // Log the entire event object to see what's available
  console.log("=== POST AUTHENTICATION EVENT ===");
  console.log("Full event object:", JSON.stringify(event, null, 2));
  
  // Log specific event properties if they exist
  if (event.context?.user) {
    console.log("User data:", event.context.user);
    
    // Try to get full user details with organizations if we have a user ID
    if (event.context.user.id) {
      try {
        console.log("Fetching detailed user data with organizations...");
        await getUserWithOrganizations(event.context.user.id);
      } catch (error) {
        console.error("Failed to fetch detailed user data:", error);
      }
    }
  }
  
  if (event.context?.auth) {
    console.log("Auth data:", event.context.auth);
  }

  if (event.context?.application) {
    console.log("Application data:", event.context.application);
  }

  // Log all available properties on the event
  console.log("Event keys:", Object.keys(event));
  
  // Try to access any other properties that might be on the event
  for (const key in event) {
    if (event.hasOwnProperty(key)) {
      console.log(`${key}:`, (event as any)[key]);
    }
  }
} 