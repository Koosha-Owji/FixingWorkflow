import {
  onUserPreRegistrationEvent,
  WorkflowSettings,
  WorkflowTrigger,
  denyAccess,
} from "@kinde/infrastructure";

// Pre-registration workflow that blocks specific email addresses from signing up
const BLOCKED_EMAILS = ["123456789@kooshaowji.onmicrosoft.com"];

export const workflowSettings: WorkflowSettings = {
  id: "preRegistration",
  name: "Block specific emails",
  trigger: WorkflowTrigger.UserPreRegistration,
  failurePolicy: { action: "stop" },
  bindings: {
    "kinde.auth": {}, // Required for denyAccess
  },
};

export default async function Workflow(event: onUserPreRegistrationEvent) {
  const email = event.context.user.email;

  if (!email) {
    console.log(
      "No user email found in pre-registration event, allowing registration"
    );
    return;
  }

  if (BLOCKED_EMAILS.includes(email.trim().toLowerCase())) {
    console.log(`Blocking registration for email: ${email}`);
    denyAccess("This email address is not allowed to register");
  } else {
    console.log(`Allowing registration for email: ${email}`);
  }
}
