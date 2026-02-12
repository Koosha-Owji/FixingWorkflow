import {
  onNewPasswordProvidedEvent,
  WorkflowSettings,
  WorkflowTrigger,
  invalidateFormField,
  fetch,
} from "@kinde/infrastructure";

// Have I Been Pwned password check workflow
// - Uses the k-anonymity "range" API to avoid sending full password hashes
// - No configuration required; uses the public HIBP range endpoint and a threshold of 1

const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range";
const BREACH_THRESHOLD = 1;

export const workflowSettings: WorkflowSettings = {
  id: "checkPasswordWithHaveIBeenPwned",
  name: "Check password against HIBP",
  trigger: WorkflowTrigger.NewPasswordProvided,
  failurePolicy: { action: "stop" },
  bindings: {
    "kinde.widget": {}, // Required for accessing the UI
    "kinde.fetch": {}, // Required for external API calls
  },
};

async function sha1HexUpper(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function parseMatches(body: string, suffix: string): number {
  const lines = body.split("\n");

  for (const line of lines) {
    const [hashSuffix, count] = line.trim().split(":");
    if (hashSuffix?.toUpperCase() === suffix) {
      const parsed = parseInt(count ?? "0", 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }
  }

  return 0;
}

export default async function Workflow(event: onNewPasswordProvidedEvent) {
  const password = event.context.auth.firstPassword;

  if (!password) {
    console.warn("No password provided in event context.");
    return;
  }

  const fullHash = await sha1HexUpper(password);
  const prefix = fullHash.slice(0, 5);
  const suffix = fullHash.slice(5);

  try {
    const response = await fetch(`${HIBP_RANGE_URL}/${prefix}`, {
      method: "GET",
      headers: {
        "User-Agent": "Kinde-Workflow-HIBP-Check",
        "Add-Padding": "true", // request padded responses to reduce inference risk
      },
    });

    // Kinde fetch may return { data }, or a Response-like with text(), or a raw string
    let body: unknown = (response as any)?.data ?? response;

    if (typeof body !== "string" && typeof (response as any)?.text === "function") {
      body = await (response as any).text();
    }

    if (typeof body !== "string") {
      console.error("Unexpected response shape from HIBP range API.");
      return;
    }

    const matchCount = parseMatches(body, suffix);

    if (matchCount >= BREACH_THRESHOLD) {
      const message =
        "This password appears in known breaches. Please choose a different one.";
      invalidateFormField("p_first_password", message);
      invalidateFormField("p_second_password", message);
    }
  } catch (error) {
    console.error("Failed to check password against Have I Been Pwned", error);
  }
}
