import {
  onExistingPasswordProvidedEvent,
  WorkflowSettings,
  WorkflowTrigger,
  invalidateFormField,
  secureFetch,
  fetch,
  getEnvironmentVariable,
} from "@kinde/infrastructure";

// This workflow progressively migrates users from Azure AD B2C.
// Your API should perform a password verification (e.g., via ROPC) against
// Azure AD B2C and return a minimal profile to provision the user in Kinde.
//
// Env vars required:
// - AZURE_B2C_PASSWORD_CHECK_URL: HTTPS endpoint that validates email/password via Azure AD B2C
// Optional pass-through (if your API needs them):
// - AZURE_B2C_TENANT
// - AZURE_B2C_CLIENT_ID
// - AZURE_B2C_ROPC_POLICY
// - AZURE_B2C_SCOPE

export const workflowSettings: WorkflowSettings = {
  id: "existingPasswordProvided-azureB2C",
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
    const AZURE_B2C_TENANT = getEnvironmentVariable("AZURE_B2C_TENANT")?.value; // e.g. contoso
    const AZURE_B2C_CLIENT_ID = getEnvironmentVariable("AZURE_B2C_CLIENT_ID")?.value;
    const AZURE_B2C_ROPC_POLICY = getEnvironmentVariable("AZURE_B2C_ROPC_POLICY")?.value; // e.g. B2C_1A_ROPC
    const AZURE_B2C_SCOPE = getEnvironmentVariable("AZURE_B2C_SCOPE")?.value; // e.g. https://contoso.onmicrosoft.com/api/read openid profile

    if (!AZURE_B2C_TENANT || !AZURE_B2C_CLIENT_ID || !AZURE_B2C_ROPC_POLICY) {
      throw Error("Missing required Azure B2C configuration");
    }

    const tokenEndpoint = `https://${AZURE_B2C_TENANT}.b2clogin.com/${AZURE_B2C_TENANT}.onmicrosoft.com/${AZURE_B2C_ROPC_POLICY}/oauth2/v2.0/token`;

    const formBody: Record<string, string> = {
      grant_type: "password",
      username: providedEmail,
      password: password,
      client_id: AZURE_B2C_CLIENT_ID,
      scope: AZURE_B2C_SCOPE || "openid profile email",
    };

    const { data: tokenData } = await secureFetch(tokenEndpoint, {
      method: "POST",
      responseFormat: "json",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: formBody,
    });

    if (!tokenData?.access_token) {
      invalidateFormField("p_password", "Email or password not found");
      return;
    }

    const kindeAPI = fetch;

    const { data: created } = await kindeAPI.post({
      endpoint: "user",
      params: JSON.stringify({
        profile: {
          // Azure B2C ROPC may not return names; keep undefined or map from your attributes
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
    console.error("azure b2c migration error", error);
  }
}


