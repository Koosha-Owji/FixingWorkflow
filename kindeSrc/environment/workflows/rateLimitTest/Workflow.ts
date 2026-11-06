import {
  fetch,
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
// What the first run showed about the runtime:
// - About 1,600 calls fit in one run before "execution time exceeded", so one run cannot reach 2,000.
// - Date.now() does not advance during a run (every reading was 0ms after the start). Elapsed time
//   is read from Cloudflare's /cdn-cgi/trace instead, which also gives the outbound IP.
// - kinde.fetch returns only { json }: no status, no headers. A 429 has an empty body, so an empty
//   response is taken as the 429.
//
// So the test takes two sign-ins within a minute. Each run makes RATE_TEST_CALLS calls (default
// 1,200) to GET /api/v1/users with the M2M app in KINDE_WF_M2M_CLIENT_ID / _SECRET, stopping at the
// first empty response. If workflow traffic has the same 2,000-per-minute limit, the second run is
// refused after about 800. Compare the two runs' "started" times to check they fell in one minute.
// Failure policy "continue": it never blocks the sign-in.

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

const DEFAULT_CALLS = 1200;
const PROGRESS_EVERY = 200;
// Give up after this many error bodies in a row (bad scope, bad credentials).
const MAX_ERRORS_IN_A_ROW = 5;

function env(key: string): string | undefined {
  return getEnvironmentVariable(key)?.value;
}

// Real time and outbound IP from Cloudflare, since the runtime's clock is frozen during a run.
async function trace(): Promise<{ ts: number | null; ip: string | null }> {
  try {
    const { data } = await fetch<{ data: string }>("https://www.cloudflare.com/cdn-cgi/trace", {
      method: "GET",
      responseFormat: "text",
      headers: {},
    });
    const text = String(data);
    const ts = parseFloat(/^ts=(.+)$/m.exec(text)?.[1] ?? "");
    const ip = /^ip=(.+)$/m.exec(text)?.[1] ?? null;
    return { ts: Number.isFinite(ts) ? ts : null, ip };
  } catch {
    return { ts: null, ip: null };
  }
}

export default async function Workflow(event: onPostAuthenticationEvent) {
  const domain = event.context.domains.kindeDomain;
  console.log("Rate limit test: started", new Date().toISOString());

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

  const start = await trace();
  console.log("Rate limit test: first call at", start.ts, "from IP", start.ip);

  let ok = 0;
  let errorsInARow = 0;
  let stopReason = `reached ${maxCalls} calls with no 429`;

  for (let i = 0; i < maxCalls; i++) {
    let res: unknown;
    try {
      res = await kinde.fetch(url, options);
    } catch (e) {
      stopReason = `threw after ${ok} ok: ${(e as Error).message ?? String(e)}`;
      break;
    }
    const body = (res as { json?: { code?: string; users?: unknown } | null } | null)?.json;
    if (body?.code === "OK" || Array.isArray(body?.users)) {
      ok++;
      errorsInARow = 0;
      if (ok % PROGRESS_EVERY === 0) {
        console.log(`Rate limit test: ${ok} ok`);
      }
    } else if (body === undefined || body === null || (typeof body === "object" && Object.keys(body).length === 0)) {
      stopReason = `empty response (the 429) after ${ok} ok: ${JSON.stringify(res ?? null).slice(0, 300)}`;
      break;
    } else {
      console.log(`Rate limit test: error body after ${ok} ok:`, JSON.stringify(body).slice(0, 500));
      if (++errorsInARow >= MAX_ERRORS_IN_A_ROW) {
        stopReason = `${MAX_ERRORS_IN_A_ROW} error bodies in a row after ${ok} ok`;
        break;
      }
    }
  }

  const end = await trace();
  const seconds = start.ts !== null && end.ts !== null ? +(end.ts - start.ts).toFixed(1) : null;
  console.log(
    "Rate limit test: summary",
    JSON.stringify({
      ok,
      seconds,
      perMinute: seconds ? Math.round((ok / seconds) * 60) : null,
      stopReason,
      ip: start.ip,
    })
  );
}
