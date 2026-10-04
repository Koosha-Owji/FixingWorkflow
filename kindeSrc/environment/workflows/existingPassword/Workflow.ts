import {
  onExistingPasswordProvidedEvent,
  WorkflowSettings,
  WorkflowTrigger,
  invalidateFormField,
  secureFetch,
  getEnvironmentVariable,
  createKindeAPI,
} from "@kinde/infrastructure";

// Drip-feed migration from VisualDLP (MembershipReboot) to Kinde.
//
// The first time a VisualDLP user signs in to Kinde there is no Kinde user yet. Each VisualDLP tenant
// has its own MembershipReboot database, so this workflow asks each tenant's
// /api/oauth2/validate_credentials in turn. The first 200 means that tenant's credential check accepts
// them, and the workflow creates the Kinde user with that password. From then on
// hasUserRecordInKinde is true, the workflow returns at once and Kinde checks the password itself.
//
// Setup in Kinde (see README.md at the repo root):
// - Workflow encryption key: the same key as every tenant's Kinde:WorkflowEncryptionKey.
// - M2M application with create:users and update:user_passwords; its id and secret in the
//   environment variables KINDE_WF_M2M_CLIENT_ID and KINDE_WF_M2M_CLIENT_SECRET (sensitive).
// - Environment variable VDLP_VALIDATE_CREDENTIALS_URLS: the tenants' endpoints, comma-separated,
//   e.g. https://<tenant a host>/api/oauth2/validate_credentials,https://<tenant b host>/api/oauth2/validate_credentials
// - Environment variable VDLP_MIGRATION_CLIENT_IDS: the client ids of the applications whose
//   sign-ins are migrated, comma-separated.

export const workflowSettings: WorkflowSettings = {
  id: "vdlpDripFeedMigration",
  name: "VisualDLP drip-feed migration",
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

// The fields Kinde documents for this trigger. The event type in @kinde/infrastructure
// declares only `password`.
type ExistingPasswordAuth = {
  providedEmail: string;
  password: string;
  hashedPassword: string;
  hasUserRecordInKinde: boolean;
};

type VdlpValidationResponse = {
  given_name: string | null;
  family_name: string | null;
};

// VisualDLP answers 401 for credentials it refuses and for any body it cannot open. Whether
// secureFetch throws on a non-2xx or resolves without data, both mean "not a login on this tenant".
async function validateAgainstTenant(
  url: string,
  email: string,
  password: string
): Promise<VdlpValidationResponse | null> {
  try {
    const { data } = await secureFetch<{ data: VdlpValidationResponse | null }>(url, {
      method: "POST",
      responseFormat: "json",
      headers: { "content-type": "application/json" },
      // issued_at bounds how long a captured body can be replayed; VisualDLP refuses one older
      // than five minutes. The typings declare URLSearchParams; Kinde's own example sends an object.
      body: {
        email,
        password,
        issued_at: Math.floor(Date.now() / 1000),
      } as unknown as URLSearchParams,
    });
    return data ?? null;
  } catch {
    return null;
  }
}

export default async function Workflow(event: onExistingPasswordProvidedEvent) {
  const { providedEmail, password, hashedPassword, hasUserRecordInKinde } =
    event.context.auth as unknown as ExistingPasswordAuth;

  if (hasUserRecordInKinde) {
    return;
  }

  // Kinde runs a workflow for every application in the environment; only migrate sign-ins to
  // the VisualDLP applications. A sign-in to any other app falls through to Kinde's own check.
  const clientIds = getEnvironmentVariable("VDLP_MIGRATION_CLIENT_IDS")?.value;
  if (!clientIds) {
    throw new Error("VDLP_MIGRATION_CLIENT_IDS is not set");
  }
  const allowed = clientIds.split(",").map((id) => id.trim());
  if (!allowed.includes(event.context.application.clientId)) {
    return;
  }

  const urls = (getEnvironmentVariable("VDLP_VALIDATE_CREDENTIALS_URLS")?.value ?? "")
    .split(",")
    .map((u) => u.trim())
    .filter((u) => u.length > 0);
  if (urls.length === 0) {
    throw new Error("VDLP_VALIDATE_CREDENTIALS_URLS is not set");
  }

  // Tried in order, stopping at the first tenant that accepts. Each refusal counts as a failed
  // sign-in against that tenant's account for the email, if it has one.
  let vdlpUser: VdlpValidationResponse | null = null;
  for (const url of urls) {
    vdlpUser = await validateAgainstTenant(url, providedEmail, password);
    if (vdlpUser) {
      break;
    }
  }

  if (!vdlpUser) {
    invalidateFormField("p_password", "Email or password not found");
    return;
  }

  const kindeAPI = await createKindeAPI(event);

  const profile: Record<string, string> = {};
  if (vdlpUser.given_name) profile.given_name = vdlpUser.given_name;
  if (vdlpUser.family_name) profile.family_name = vdlpUser.family_name;

  // A JSON string here and a plain object for the password call below, as in Kinde's drip-feed
  // example; the typings accept neither shape exactly.
  const { data: created } = await kindeAPI.post({
    endpoint: "user",
    params: JSON.stringify({
      profile,
      identities: [
        {
          type: "email",
          // VisualDLP only accepts a login from a verified account.
          is_verified: true,
          details: { email: providedEmail },
        },
      ],
    }) as unknown as Record<string, string>,
  });

  await kindeAPI.put({
    endpoint: `users/${created.id}/password`,
    params: { hashed_password: hashedPassword },
  });
}
