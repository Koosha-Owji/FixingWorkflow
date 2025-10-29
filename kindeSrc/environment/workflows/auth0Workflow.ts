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
  const KINDE_DOMAIN = "kooshaowji.kinde.com";
  const clientId = getEnvironmentVariable("KINDE_WF_M2M_CLIENT_ID")?.value;
  const clientSecret = getEnvironmentVariable("KINDE_WF_M2M_CLIENT_SECRET")?.value;

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
      const response = await fetch(`https://${KINDE_DOMAIN}/api/v1/${endpoint}`, {
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
      const response = await fetch(`https://${KINDE_DOMAIN}/api/v1/${endpoint}`, {
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

    console.log("Creating user...");
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

    console.log("Create user response:", JSON.stringify(res));

    const userId = res.id;
    console.log("User ID:", userId);

    console.log("Setting password...");
    const { data: pwdRes } = await kindeAPI.put({
      endpoint: `users/${userId}/password`,
      params: {
        hashed_password: hashedPassword,
      },
    });
    
    console.log("Password response:", JSON.stringify(pwdRes));
    console.log(pwdRes.message || "User created successfully");
  } catch (error) {
    console.error("error", error);
    throw error;
  }
}
