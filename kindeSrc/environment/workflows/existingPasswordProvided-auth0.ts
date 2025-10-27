import {
  onExistingPasswordProvidedEvent,
  WorkflowSettings,
  WorkflowTrigger,
  invalidateFormField,
  secureFetch,
  fetch,
  getEnvironmentVariable,
} from "@kinde/infrastructure";

// This workflow progressively migrates users from Auth0.
// Your API should validate credentials against Auth0 (e.g., ROPC) and return
// a minimal profile so we can provision the user in Kinde.
//
// Env vars required:
// - AUTH0_PASSWORD_CHECK_URL: HTTPS endpoint that validates email/password via Auth0

export const workflowSettings: WorkflowSettings = {
  id: "existingPasswordProvided-auth0",
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
    const AUTH0_DOMAIN = getEnvironmentVariable("AUTH0_DOMAIN")?.value; // e.g. your-tenant.auth0.com
    const AUTH0_CLIENT_ID = getEnvironmentVariable("AUTH0_CLIENT_ID")?.value;
    const AUTH0_CLIENT_SECRET = getEnvironmentVariable("AUTH0_CLIENT_SECRET")?.value; // optional if not required
    const AUTH0_CONNECTION = getEnvironmentVariable("AUTH0_CONNECTION")?.value; // database connection name

    if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID || !AUTH0_CONNECTION) {
      throw Error("Missing required Auth0 configuration");
    }

    const tokenEndpoint = `https://${AUTH0_DOMAIN}/oauth/token`;
    const tokenPayload: Record<string, string> = {
      grant_type: "http://auth0.com/oauth/grant-type/password-realm",
      realm: AUTH0_CONNECTION,
      username: providedEmail,
      password: password,
      client_id: AUTH0_CLIENT_ID,
      scope: "openid profile email",
    };
    if (AUTH0_CLIENT_SECRET) {
      tokenPayload.client_secret = AUTH0_CLIENT_SECRET;
    }

    const { data: tokenData } = await secureFetch(tokenEndpoint, {
      method: "POST",
      responseFormat: "json",
      headers: {
        "content-type": "application/json",
      },
      body: tokenPayload,
    });

    if (!tokenData?.access_token) {
      invalidateFormField("p_password", "Email or password not found");
      return;
    }

    // Fetch profile details from Auth0 userinfo (optional, requires openid profile email)
    let given_name: string | undefined;
    let family_name: string | undefined;
    try {
      const userInfoEndpoint = `https://${AUTH0_DOMAIN}/userinfo`;
      const { data: userInfo } = await secureFetch(userInfoEndpoint, {
        method: "GET",
        responseFormat: "json",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });
      given_name = userInfo?.given_name;
      family_name = userInfo?.family_name;
    } catch {}

    const kindeAPI = fetch;

    const { data: created } = await kindeAPI.post({
      endpoint: "user",
      params: JSON.stringify({
        profile: {
          given_name,
          family_name,
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
    console.error("auth0 migration error", error);
  }
}


