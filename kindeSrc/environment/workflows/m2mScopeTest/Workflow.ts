import { onM2MTokenGeneratedEvent, WorkflowSettings, WorkflowTrigger } from "@kinde/infrastructure";

// Test for m2m:token_generation: does the workflow run before Kinde validates the requested scopes, and
// can it add a scope the application isn't granted? It makes three separate attempts and logs each result:
// overwrite scope, overwrite scp (on Kinde's blocked list), and a separately named claim.
//
// The low-level binding is used for scope and scp because the typed m2mTokenClaims() helper rejects scp
// when the code is compiled, so the write would never reach Kinde to show whether its servers block it.
declare const kinde: {
  m2mToken: {
    getCustomClaims(): Record<string, unknown>;
    setCustomClaim(key: string, value: unknown): void;
  };
};

const unassignedScope = "test:unassigned_scope";

export const workflowSettings: WorkflowSettings = {
  id: "m2mScopeTest",
  name: "M2M scope test",
  trigger: WorkflowTrigger.M2MTokenGeneration,
  failurePolicy: { action: "continue" },
  bindings: {
    console: {},
    "kinde.m2mToken": {},
  },
};

const attempt = (label: string, write: () => void): void => {
  try {
    write();
    console.log(`M2M SCOPE TEST: ${label}: no error. Claims now`, JSON.stringify(kinde.m2mToken.getCustomClaims()));
  } catch (error) {
    console.log(`M2M SCOPE TEST: ${label}: failed`, String(error));
  }
};

export default async function Workflow(event: onM2MTokenGeneratedEvent) {
  console.log("M2M SCOPE TEST: workflow ran. Request", JSON.stringify(event.request));
  console.log("M2M SCOPE TEST: claims before", JSON.stringify(kinde.m2mToken.getCustomClaims()));

  const requested = event.request.auth?.scope ?? [];

  attempt("1. overwrite scope", () =>
    kinde.m2mToken.setCustomClaim("scope", [...requested, unassignedScope].join(" "))
  );
  attempt("2. overwrite scp", () => kinde.m2mToken.setCustomClaim("scp", [unassignedScope]));
  attempt("3. custom entitlements claim", () =>
    kinde.m2mToken.setCustomClaim("entitlements", [unassignedScope])
  );
}
