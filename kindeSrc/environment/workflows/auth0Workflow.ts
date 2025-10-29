import {
  onExistingPasswordProvidedEvent,
  WorkflowSettings,
  WorkflowTrigger,
  invalidateFormField,
  fetch,
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
  },
};

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

    const kindeAPI = fetch;

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


