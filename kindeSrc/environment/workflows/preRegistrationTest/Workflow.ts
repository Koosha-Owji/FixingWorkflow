import {
  denyAccess,
  getEnvironmentVariable,
  onUserPreRegistrationEvent,
  WorkflowSettings,
  WorkflowTrigger,
} from "@kinde/infrastructure";

// Test for user:pre_registration. Logs the whole event, to see whether it fires for SAML just-in-time
// users and which field carries the email (the 0.12.0 typings only declare context.auth.connectionId).
// Set the environment variable PRE_REG_TEST_DENY to "true" to deny the registration instead, to see
// whether the user record still gets created.
export const workflowSettings: WorkflowSettings = {
  id: "preRegistrationTest",
  name: "Pre-registration test",
  trigger: WorkflowTrigger.UserPreRegistration,
  failurePolicy: { action: "stop" },
  bindings: {
    console: {},
    "kinde.env": {},
    "kinde.auth": {},
  },
};

export default async function Workflow(event: onUserPreRegistrationEvent) {
  console.log("Pre-registration test: connectionId", event.context.auth.connectionId);
  console.log("Pre-registration test: full event", JSON.stringify(event, null, 2));

  if (getEnvironmentVariable("PRE_REG_TEST_DENY")?.value === "true") {
    console.log("Pre-registration test: denying");
    denyAccess("Pre-registration test: registration denied");
  }
}
