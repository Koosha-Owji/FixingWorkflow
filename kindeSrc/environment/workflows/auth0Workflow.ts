import {
  onExistingPasswordProvidedEvent,
  WorkflowSettings,
  WorkflowTrigger,
  invalidateFormField,
  fetch,
  getEnvironmentVariable,
} from "@kinde/infrastructure";

// TEST WORKFLOW: This workflow tests the serverless migration pattern.
// It skips Auth0 validation and creates users immediately to test timing.
// For production, you would validate credentials against Auth0 first.

export const workflowSettings: WorkflowSettings = {
  id: "existingPasswordProvided-test-migration",
  trigger: WorkflowTrigger.ExistingPasswordProvided,
  failurePolicy: {
    action: "stop",
  },
  bindings: {
    "kinde.widget": {},
    "kinde.fetch": {},
    "kinde.env": {},
  },
};

// Helper function to create Kinde API client with M2M authentication
async function createKindeAPI(event: onExistingPasswordProvidedEvent) {
  const KINDE_DOMAIN = "kooshaowji.kinde.com";
  const clientId = getEnvironmentVariable("KINDE_WF_M2M_CLIENT_ID")?.value;
  const clientSecret = getEnvironmentVariable("KINDE_WF_M2M_CLIENT_SECRET")?.value;

  if (!clientId || !clientSecret) {
    throw new Error("KINDE_WF_M2M_CLIENT_ID or KINDE_WF_M2M_CLIENT_SECRET not set");
  }

  const tokenResponse = await fetch(`https://${KINDE_DOMAIN}/oauth2/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}&audience=https://${KINDE_DOMAIN}/api`,
  });

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;

  return {
    post: async ({ endpoint, params }: { endpoint: string; params: any }) => {
      const response = await fetch(`https://${KINDE_DOMAIN}/api/v1/${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(params),
      });
      return { data: await response.json() };
    },
    put: async ({ endpoint, params }: { endpoint: string; params: any }) => {
      const response = await fetch(`https://${KINDE_DOMAIN}/api/v1/${endpoint}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(params),
      });
      return { data: await response.json() };
    },
  };
}

export default async function Workflow(event: onExistingPasswordProvidedEvent) {
  const { hashedPassword, providedEmail, hasUserRecordInKinde } =
    event.context.auth;

  // If user already exists in Kinde, skip migration
  if (hasUserRecordInKinde) {
    return;
  }

  try {
    // For testing: Accept any credentials and create the user immediately
    // In production, you would validate against Auth0 here first

    const kindeAPI = await createKindeAPI(event);

    // Create user in Kinde with minimal profile
    const { data: created } = await kindeAPI.post({
      endpoint: "user",
      params: {
        profile: {
          given_name: "Test",
          family_name: "User",
        },
        identities: [
          {
            type: "email",
            details: {
              email: providedEmail,
            },
          },
        ],
      },
    });

    // Set the hashed password
    await kindeAPI.put({
      endpoint: `users/${created.id}/password`,
      params: {
        hashed_password: hashedPassword,
      },
    });

    console.log(`User created successfully: ${providedEmail}`);
  } catch (error) {
    console.error("Migration workflow error", {
      message: error instanceof Error ? error.message : "Unknown error",
      error: error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Don't invalidate the form field to see the actual error
    throw error; // Re-throw to see the full error in Kinde logs
  }
}


