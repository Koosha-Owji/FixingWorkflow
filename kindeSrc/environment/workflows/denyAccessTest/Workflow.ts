import { denyAccess, onUserTokenGeneratedEvent, WorkflowSettings, WorkflowTrigger } from "@kinde/infrastructure";

// Test only: denies every sign-in at token generation, to see what Kinde shows the user.
// While this is deployed, nobody can sign in to any application in the environment.
export const workflowSettings: WorkflowSettings = {
  id: "denyAccessTest",
  name: "Deny access test",
  trigger: WorkflowTrigger.UserTokenGeneration,
  failurePolicy: { action: "stop" },
  bindings: {
    "kinde.auth": {},
  },
};

export default async function Workflow(_event: onUserTokenGeneratedEvent) {
  denyAccess("Access denied by the deny access test workflow");
}
