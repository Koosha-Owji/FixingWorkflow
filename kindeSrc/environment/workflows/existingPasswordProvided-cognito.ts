import {
  onExistingPasswordProvidedEvent,
  WorkflowSettings,
  WorkflowTrigger,
  invalidateFormField,
  secureFetch,
  fetch,
  getEnvironmentVariable,
} from "@kinde/infrastructure";

// This workflow progressively migrates users from AWS Cognito without forcing
// password resets. Your API should call Cognito InitiateAuth with
// USER_PASSWORD_AUTH to validate credentials and return a minimal profile.
//
// Env vars required:
// - COGNITO_PASSWORD_CHECK_URL: HTTPS endpoint that validates email/password via Cognito
// Optional pass-through (if your API needs them):
// - COGNITO_USER_POOL_ID
// - COGNITO_CLIENT_ID
// - COGNITO_CLIENT_SECRET (if used)

export const workflowSettings: WorkflowSettings = {
  id: "existingPasswordProvided-cognito",
  trigger: WorkflowTrigger.ExistingPasswordProvided,
  failurePolicy: {
    action: "stop",
  },
  bindings: {
    "kinde.widget": {},
    "kinde.secureFetch": {},
    "kinde.env": {},
    "kinde.fetch": {},
    url: {},
  },
};

export default async function Workflow(event: onExistingPasswordProvidedEvent) {
  const { hashedPassword, providedEmail, password, hasUserRecordInKinde } =
    event.context.auth;

  if (hasUserRecordInKinde) {
    return;
  }

  try {
    // For AWS Cognito, calling InitiateAuth directly from the workflow is
    // impractical due to AWS SigV4 and SDK needs. Keep a backend endpoint.
    const COGNITO_PASSWORD_CHECK_URL = getEnvironmentVariable(
      "COGNITO_PASSWORD_CHECK_URL"
    )?.value;
    if (!COGNITO_PASSWORD_CHECK_URL) {
      throw Error("COGNITO_PASSWORD_CHECK_URL not set");
    }

    const { data: verify } = await secureFetch(COGNITO_PASSWORD_CHECK_URL, {
      method: "POST",
      responseFormat: "json",
      headers: {
        "content-type": "application/json",
      },
      body: {
        email: providedEmail,
        password,
      },
    });

    if (!verify?.verified) {
      invalidateFormField("p_password", "Email or password not found");
      return;
    }

    const kindeAPI = fetch;

    const { data: created } = await kindeAPI.post({
      endpoint: "user",
      params: JSON.stringify({
        profile: {
          given_name: verify.given_name,
          family_name: verify.family_name,
        },
        identities: [
          {
            type: "email",
            details: {
              email: providedEmail,
            },
          },
        ],
      }),
    });

    await kindeAPI.put({
      endpoint: `users/${created.id}/password`,
      params: {
        hashed_password: hashedPassword,
      },
    });
  } catch (error) {
    console.error("cognito migration error", error);
  }
}


