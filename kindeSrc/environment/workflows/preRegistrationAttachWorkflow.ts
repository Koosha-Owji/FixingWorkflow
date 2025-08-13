import {
  WorkflowSettings,
  getEnvironmentVariable,
} from "@kinde/infrastructure";

// The settings for this workflow
export const workflowSettings: WorkflowSettings = {
  id: "preRegistrationPolicies",
  name: "Attach TOS/Privacy URLs at pre-registration",
  failurePolicy: {
    action: "stop",
  },
  // The SDK enum name may vary; use string literal to align with user:pre_registration
  trigger: "user:pre_registration",
  bindings: {
    "kinde.env": {},
  },
};

export default async function handlePreRegistration(event: any) {
  // Example payload location for org code per docs
  const authParams = event?.request?.authUrlParams ?? {};
  console.log("[pre-registration] authUrlParams:", JSON.stringify(authParams));
  console.log("[pre-registration] request:", JSON.stringify(event?.request || {}));
  const orgCode = authParams.orgCode || authParams.org_code || null;

  // 1) Check consent via redirectUri query param (consent=1|true)
  const redirectUri = authParams.redirectUri || authParams.redirect_uri || "";
  let tosAccepted = false;
  let termsFromParam: string | undefined;
  let privacyFromParam: string | undefined;
  if (redirectUri && typeof redirectUri === "string") {
    const qIndex = redirectUri.indexOf("?");
    if (qIndex !== -1) {
      const query = redirectUri.slice(qIndex + 1);
      const pairs = query.split("&");
      const map: Record<string, string> = {};
      for (const pair of pairs) {
        const [rawK, rawV = ""] = pair.split("=");
        try {
          const k = decodeURIComponent(rawK);
          const v = decodeURIComponent(rawV.replace(/\+/g, " "));
          map[k] = v;
        } catch (_e) {
          // ignore bad encoding
        }
      }
      const consent = (map["consent"] || "").toLowerCase();
      tosAccepted = consent === "1" || consent === "true";
      if (map["termsUrl"]) termsFromParam = map["termsUrl"];
      if (map["privacyUrl"]) privacyFromParam = map["privacyUrl"];
    }
  }

  // For testing: read from env or fallback to hardcoded demo URLs
  const TERMS_URL = termsFromParam || getEnvironmentVariable("TERMS_URL")?.value || "https://example.com/terms";
  const PRIVACY_URL = privacyFromParam || getEnvironmentVariable("PRIVACY_URL")?.value || "https://example.com/privacy";

  // 2) Fallback: support consent via base64 JSON in planInterest
  if (!tosAccepted) {
    const planInterestParam = authParams.planInterest || authParams.plan_interest;
    if (planInterestParam) {
      try {
        const b64 = String(planInterestParam).replace(/-/g, "+").replace(/_/g, "/");
        const json = atob(b64);
        const decoded = JSON.parse(json);
        tosAccepted = Boolean(decoded?.tosAccepted);
      } catch (_e) {
        // ignore parse errors
      }
    }
  }

  if (!tosAccepted) {
    console.log("[pre-registration] blocking: TOS not accepted (consent missing)");
    throw new Error("You must accept the Terms and Privacy Policy to sign up.");
  }

  // Mutate the incoming event context directly so the workflow engine persists it
  event.context = event.context || {};
  event.context.user = event.context.user || {};
  const existingAttributes = event.context.user.custom_attributes || {};

  // Optionally vary by orgCode. For now, attach same values for testing
  event.context.user.custom_attributes = {
    ...existingAttributes,
    terms_url: TERMS_URL,
    privacy_url: PRIVACY_URL,
    org_code: orgCode || existingAttributes.org_code,
    _pre_reg_ts: new Date().toISOString(),
  };

  console.log("[pre-registration] custom_attributes set:", JSON.stringify(event.context.user.custom_attributes));

  // Return both event and context to maximize compatibility with engine expectations
  return { event, context: event.context };
}


