import {
  onExistingPasswordProvidedEvent,
  WorkflowSettings,
  WorkflowTrigger,
  invalidateFormField,
  secureFetch,
  fetch,
  getEnvironmentVariable,
} from "@kinde/infrastructure";

// This workflow progressively migrates users from a legacy auth system.
// It verifies the provided password against your legacy API, then creates the
// user in Kinde and sets their password for subsequent logins.
//
// Prerequisites:
// - Configure an M2M application with scopes: create:users, update:user_passwords
// - Configure environment variables:
//   - CHECK_PASSWORD_API_URL: HTTPS endpoint that validates email/password
//   - KINDE_WF_M2M_CLIENT_ID / KINDE_WF_M2M_CLIENT_SECRET (if required by your setup)

export const workflowSettings: WorkflowSettings = {
  id: "existingPasswordProvided-legacy",
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
    const CHECK_PASSWORD_API_URL = getEnvironmentVariable(
      "CHECK_PASSWORD_API_URL"
    )?.value;

    if (!CHECK_PASSWORD_API_URL) {
      throw Error("CHECK_PASSWORD_API_URL not set");
    }

    const { data: userData } = await secureFetch(CHECK_PASSWORD_API_URL, {
      method: "POST",
      responseFormat: "json",
      headers: {
        "content-type": "application/json",
      },
      body: { email: providedEmail, password },
    });

    if (!userData?.verified) {
      invalidateFormField("p_password", "Email or password not found");
      return;
    }

    const kindeAPI = fetch;

    const { data: created } = await kindeAPI.post({
      endpoint: "user",
      params: JSON.stringify({
        profile: {
          given_name: userData.given_name,
          family_name: userData.family_name,
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
    console.error("legacy migration error", error);
  }
}


