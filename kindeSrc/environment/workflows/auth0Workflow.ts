import {
  onExistingPasswordProvidedEvent,
  WorkflowSettings,
  WorkflowTrigger,
  invalidateFormField,
  secureFetch,
  fetch,
  getEnvironmentVariable,
} from "@kinde/infrastructure";



// This workflow requires you to set up the Kinde management API
// You can do this by going to the Kinde dashboard.
//
// Create an M2M application with the following scopes enabled:
// * create:users
// * update:user_passwords
//
// In Settings -> Environment variables set up the following variables with the
// values from the M2M application you created above:
//
// * KINDE_WF_M2M_CLIENT_ID
// * KINDE_WF_M2M_CLIENT_SECRET - Ensure this is setup with sensitive flag
// enabled to prevent accidental sharing
//
// Add an environment variable with the key `CHECK_PASSWORD_API_URL`
// and the value of your URL for checking passwords.
//
// This workflow requires you to set up your encryption key for the workflow
// This enables `secureFetch` to encrypt the payload sent to your API

// The setting for this workflow
export const workflowSettings: WorkflowSettings = {
  id: "onExistingPasswordProvided",
  trigger: WorkflowTrigger.ExistingPasswordProvided,
  failurePolicy: {
    action: "stop",
  },
  bindings: {
    "kinde.widget": {}, // Required for accessing the UI
    "kinde.secureFetch": {}, // Required for secure external API calls
    "kinde.env": {}, // required to access your environment variables
    "kinde.fetch": {}, // Required for management API calls
    url: {}, // required for url params
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

// The workflow code to be executed when the event is triggered
export default async function Workflow(event: onExistingPasswordProvidedEvent) {
  const { hashedPassword, providedEmail, password, hasUserRecordInKinde } =
    event.context.auth;

  if (hasUserRecordInKinde) {
    console.log("User exists in Kinde");
    return;
  }
  console.log("User does not exist in Kinde");

  try {
    // Assume the password matched with external system
    // Create mock userData as if it came from external system
    const userData = {
      given_name: "Migrated",
      family_name: "User",
    };

    // Password is verified in the external system
    // You can create the user in Kinde and set the password
    const kindeAPI = await createKindeAPI(event);

    // Create the user in Kinde
    // You can use the userData from the external system to populate the Kinde user
    const { data: res } = await kindeAPI.post({
      endpoint: `user`,
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

    const userId = res.id;

    // Set the password for the user in Kinde
    // You can use the hashed password provided by Kinde
    const { data: pwdRes } = await kindeAPI.put({
      endpoint: `users/${userId}/password`,
      params: {
        hashed_password: hashedPassword,
      },
    });
    console.log(pwdRes.message);
  } catch (error) {
    console.error("error", error);
  }
}
