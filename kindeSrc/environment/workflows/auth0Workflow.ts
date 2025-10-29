import {
  onExistingPasswordProvidedEvent,
  WorkflowSettings,
  WorkflowTrigger,
  invalidateFormField,
  fetch,
  getEnvironmentVariable,
} from "@kinde/infrastructure";

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
  const issuerUrl = getEnvironmentVariable("KINDE_WF_ISSUER_URL")?.value;
  const clientId = getEnvironmentVariable("KINDE_WF_M2M_CLIENT_ID")?.value;
  const clientSecret = getEnvironmentVariable("KINDE_WF_M2M_CLIENT_SECRET")?.value;

  const tokenUrl = `${issuerUrl}/oauth2/token`;
  const tokenBody = `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}&audience=${issuerUrl}/api`;

  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: tokenBody,
    responseFormat: "json",
  });

  const accessToken = tokenResponse.data.access_token;

  return {
    post: async ({ endpoint, params }: { endpoint: string; params: any }) => {
      const response = await fetch(`${issuerUrl}/api/v1/${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: params,
        responseFormat: "json",
      });
      return { data: response };
    },
    put: async ({ endpoint, params }: { endpoint: string; params: any }) => {
      const response = await fetch(`${issuerUrl}/api/v1/${endpoint}`, {
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
    return;
  }
  
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
            is_verified: true,
            details: {
              email: providedEmail,
            },
          },
        ],
      }),
    });

    const userId = res.data.id;

    // Set the password for the user in Kinde
    await kindeAPI.put({
      endpoint: `users/${userId}/password`,
      params: {
        hashed_password: hashedPassword,
      },
    });
    
    console.log(`User migrated successfully: ${providedEmail}`);
  } catch (error) {
    console.error("Migration error", error);
    invalidateFormField("p_password", "Unable to migrate user. Please try again.");
    throw error;
  }
}
