import {
  getEnvironmentVariable,
  getM2MToken,
  KindeFetchOptions,
  onPostAuthenticationEvent,
  WorkflowSettings,
  WorkflowTrigger,
} from "@kinde/infrastructure";

// Does Management API traffic from a workflow hit the same 2,000-per-minute limit as calls from our
// own machine? Measured locally (2026-11-06): the first 429 came after exactly 2,000 calls, with
// RateLimit-Reset making up the rest of a one-minute window.
//
// On each sign-in this calls GET /api/v1/users with the M2M app in KINDE_WF_M2M_CLIENT_ID / _SECRET
// until the first 429, or RATE_TEST_CALLS calls (default 2,100). It logs progress every 200 calls,
// so if Kinde stops the workflow for running too long, the logs still show how far it got and how
// fast. Failure policy "continue": it never blocks the sign-in.
//
// The calls go through the raw kinde.fetch because createKindeAPI's get() returns only the response
// body, and a 429 has an empty body. The first raw response is logged so its shape is visible.

export const workflowSettings: WorkflowSettings = {
  id: "rateLimitTest",
  name: "Rate limit test",
  trigger: WorkflowTrigger.PostAuthentication,
  failurePolicy: { action: "continue" },
  bindings: {
    console: {},
    "kinde.env": {},
    "kinde.fetch": {},
    url: {},
  },
};

// The runtime's own fetch, which the package wraps but does not declare.
declare const kinde: {
  fetch: (url: string, options: KindeFetchOptions) => unknown;
};

const DEFAULT_CALLS = 2100;
// Calls started together. If the runtime's fetch blocks, they run one at a time regardless.
const WORKERS = 3;
const PROGRESS_EVERY = 200;
// Give up after this many failures in a row that are not 429s (bad scope, bad credentials).
const MAX_OTHER_IN_A_ROW = 5;

function env(key: string): string | undefined {
  return getEnvironmentVariable(key)?.value;
}

function statusOf(res: unknown): number | undefined {
  const r = res as { status?: unknown; statusCode?: unknown } | null;
  const status = r?.status ?? r?.statusCode;
  return typeof status === "number" ? status : undefined;
}

export default async function Workflow(event: onPostAuthenticationEvent) {
  const domain = event.context.domains.kindeDomain;
  console.log("Rate limit test: started", new Date().toISOString(), domain);

  const clientId = env("KINDE_WF_M2M_CLIENT_ID");
  const clientSecret = env("KINDE_WF_M2M_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    console.log("Rate limit test: KINDE_WF_M2M_CLIENT_ID or KINDE_WF_M2M_CLIENT_SECRET not set");
    return;
  }

  const requested = parseInt(env("RATE_TEST_CALLS") ?? "", 10);
  const maxCalls = Number.isFinite(requested) && requested > 0 ? requested : DEFAULT_CALLS;

  let token: string;
  try {
    token = String(
      await getM2MToken("rate_test_m2m_token", {
        domain,
        clientId,
        clientSecret,
        audience: [`${domain}/api`],
        skipCache: true,
      })
    ).replace(/"/g, "");
  } catch (e) {
    console.log("Rate limit test: token failed", (e as Error).message);
    return;
  }

  const url = `${domain}/api/v1/users?page_size=1`;
  const options: KindeFetchOptions = {
    method: "GET",
    responseFormat: "json",
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
  };

  const t0 = Date.now();
  let started = 0;
  let ok = 0;
  let otherInARow = 0;
  let stopReason: string | null = null;
  let loggedShape = false;

  const worker = async () => {
    while (!stopReason && started < maxCalls) {
      started++;
      let outcome: "ok" | "429" | "other";
      let detail = "";
      try {
        const res = await kinde.fetch(url, options);
        if (!loggedShape) {
          loggedShape = true;
          console.log("Rate limit test: raw response shape", JSON.stringify(res ?? null).slice(0, 1000));
        }
        const body = (res as { json?: { code?: string; users?: unknown } } | null)?.json;
        if (statusOf(res) === 429) {
          outcome = "429";
        } else if (body?.code === "OK" || Array.isArray(body?.users)) {
          outcome = "ok";
        } else {
          outcome = "other";
        }
        detail = JSON.stringify(res ?? null).slice(0, 500);
      } catch (e) {
        detail = (e as Error).message ?? String(e);
        outcome = /429|too many/i.test(detail) ? "429" : "other";
      }

      if (outcome === "ok") {
        ok++;
        otherInARow = 0;
        if (ok % PROGRESS_EVERY === 0) {
          console.log(`Rate limit test: ${ok} ok after ${Date.now() - t0}ms`);
        }
      } else if (outcome === "429") {
        stopReason = `429 after ${ok} ok in ${Date.now() - t0}ms: ${detail}`;
      } else {
        // A 429 with its status hidden would also land here, as an empty response.
        console.log(`Rate limit test: non-ok response after ${ok} ok in ${Date.now() - t0}ms:`, detail);
        if (++otherInARow >= MAX_OTHER_IN_A_ROW) {
          stopReason = `${MAX_OTHER_IN_A_ROW} non-ok responses in a row after ${ok} ok`;
        }
      }
    }
  };

  await Promise.all(Array.from({ length: WORKERS }, worker));

  const ms = Date.now() - t0;
  console.log(
    "Rate limit test: summary",
    JSON.stringify({
      finished: new Date().toISOString(),
      ok,
      calls: started,
      ms,
      perMinute: Math.round((ok / ms) * 60000),
      stopReason: stopReason ?? `reached ${maxCalls} calls with no 429`,
    })
  );
}
