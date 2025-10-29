import {
  onExistingPasswordProvidedEvent,
  WorkflowSettings,
  WorkflowTrigger,
  invalidateFormField,
  fetch,
  getEnvironmentVariable,
} from "@kinde/infrastructure";

// TEST WORKFLOW: This workflow skips external password validation
// and creates users immediately with their provided credentials.

export const workflowSettings: WorkflowSettings = {
  id: "onExistingPasswordProvided",
  trigger: WorkflowTrigger.ExistingPasswordProvided,
  failurePolicy: {
    action: "stop",
  },
  bindings: {
    "kinde.widget": {},
    "kinde.env": {},
    "kinde.fetch": {},
  },
};

async function createKindeAPI(event: onExistingPasswordProvidedEvent) {
  const KINDE_DOMAIN = "kooshaowji.kinde.com";
  const clientId = getEnvironmentVariable("KINDE_WF_M2M_CLIENT_ID")?.value;
  const clientSecret = getEnvironmentVariable("KINDE_WF_M2M_CLIENT_SECRET")?.value;

  if (!clientId || !clientSecret) {
    throw new Error("M2M credentials not set");
  }

  // Get access token
  const tokenUrl = `https://${KINDE_DOMAIN}/oauth2/token`;
  const tokenBody = `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}&audience=https://${KINDE_DOMAIN}/api`;

  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: tokenBody,
    responseFormat: "json",
  });

  const accessToken = tokenResponse.access_token;

  return {
    post: async ({ endpoint, params }: { endpoint: string; params: any }) => {
      const url = `https://${KINDE_DOMAIN}/api/v1/${endpoint}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: typeof params === "string" ? params : JSON.stringify(params),
        responseFormat: "json",
      });
      return { data: response };
    },
    put: async ({ endpoint, params }: { endpoint: string; params: any }) => {
      const url = `https://${KINDE_DOMAIN}/api/v1/${endpoint}`;
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(params),
        responseFormat: "json",
      });
      return { data: response };
    },
  };
}

export default async function Workflow(event: onExistingPasswordProvidedEvent) {
  const { hashedPassword, providedEmail, hasUserRecordInKinde } =
    event.context.auth;

  if (hasUserRecordInKinde) {
    console.log("User exists in Kinde");
    return;
  }

  console.log("User does not exist in Kinde");

  try {
    const kindeAPI = await createKindeAPI(event);

    // Create the user in Kinde
    const { data: res } = await kindeAPI.post({
      endpoint: `user`,
      params: JSON.stringify({
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
      }),
    });

    const userId = res.id;

    // Set the password for the user in Kinde
    const { data: pwdRes } = await kindeAPI.put({
      endpoint: `users/${userId}/password`,
      params: {
        hashed_password: hashedPassword,
      },
    });

    console.log(`User created successfully: ${providedEmail}`);
  } catch (error) {
    console.error("Migration workflow error", error);
    throw error;
  }
}
