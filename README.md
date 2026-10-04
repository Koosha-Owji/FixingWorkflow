# Kinde workflows and pages

Kinde deploys this repo itself: both Kinde environments (production and non-production) are connected
to `main`, and a push deploys to both. The VisualDLP side — the `validate_credentials` endpoint and the
SPA that sends users here — is in the VisualDLP repo.

## `existingPassword` — drip-feed migration

Gets VisualDLP users into Kinde without recreating their accounts. The first time someone signs in to
Kinde with a VisualDLP email and password, Kinde has no user for them. Each VisualDLP tenant has its
own MembershipReboot database, so the workflow posts the credentials to each tenant's
`POST /api/oauth2/validate_credentials` in turn. At the first 200 it stops and creates the Kinde user
with that password. On every later sign-in the user exists in Kinde, the workflow returns at once, and
no tenant is called.

Kinde runs the workflow for every application in the environment. It only migrates sign-ins to the
applications listed in `VDLP_MIGRATION_CLIENT_IDS`; a sign-in to any other application falls through
to Kinde's own check.

One Kinde user per email. If the same email has an account in both tenants, the first tenant in the
list whose password matches is the one checked, and from then on that one Kinde password signs the
person in to either tenant: each tenant's `/oauth2/session` matches the Kinde email to its own account.
A refusal from an earlier tenant in the list is a failed password attempt against that tenant's account
for the email, if it has one.

The endpoint's decision is MembershipReboot's `AuthenticateWithUsernameOrEmail`, the call VisualDLP's
password login makes, and nothing else. It does not check two-factor; Kinde enforces its own MFA.
`When_Kinde_Workflow_Credentials_Are_Validated` (VisualDLP repo, `dlp.web.cloud.tests.integrationtests`) pins a
wrong password and an unverified account as refused.

### Request contract

The body is sealed by `kinde.secureFetch`: AES-256-GCM under the workflow encryption key, laid out as
nonce (12 bytes) + tag (16 bytes) + ciphertext, Base64URL. The plaintext is:

```json
{ "email": "...", "password": "...", "issued_at": 1700000000 }
```

`issued_at` is Unix seconds; VisualDLP refuses a body more than five minutes either side of its clock.
A body that does not decrypt under the key is refused, which is what authenticates the caller.

Responses: `200 {"given_name": ..., "family_name": ...}` (names from the matching Employee row, null
when there is none), `401` for refused credentials or an unreadable body, `503` while
`Kinde:WorkflowEncryptionKey` is unset.

### Setup

Done once in each Kinde environment (see **Kinde environments** below), with that environment's
VisualDLP hosts.

In VisualDLP, on each deployment:

- `Kinde:WorkflowEncryptionKey` — the Base64 key from the next step. The workflow has one key per Kinde
  environment, so every deployment using that environment takes the same value. A secret; never
  commit it.

In Kinde:

1. **Workflows → this workflow → Encryption keys → Add encryption key.** Copy it at once; Kinde does
   not show it again.
2. **An M2M application** authorized for the Kinde Management API with `create:users` and
   `update:user_passwords`.
3. **Settings → Environment variables:**
   - `KINDE_WF_M2M_CLIENT_ID`
   - `KINDE_WF_M2M_CLIENT_SECRET` (mark it sensitive)
   - `VDLP_VALIDATE_CREDENTIALS_URLS`: the endpoint of every VisualDLP host using this environment,
     comma-separated, in the order to try them. In production:
     `https://app.visualdlp.com/api/oauth2/validate_credentials,https://ndx.visualdlp.com/api/oauth2/validate_credentials`
   - `VDLP_MIGRATION_CLIENT_IDS`: the client ids of the VisualDLP applications in this environment,
     comma-separated.

## Sign-in pages — `login.visualdlp.com`

`kindeSrc/environment/pages/(kinde)/(default)/page.tsx` is the page Kinde renders for any sign-in
screen without a page of its own: VisualDLP's colours around Kinde's form, which Kinde places where
`getKindeWidget()` is. Pages apply to every application in the environment, so the VisualDLP footer
and legal links show only when the sign-in returns to a `*.visualdlp.com` host or `localhost`; other
applications get the card without them. The logo is the one in Kinde's brand settings.
application shows the same one. The password is typed there, on Kinde, which is what keeps the
drip-feed migration and Kinde's MFA working; only the page around the form is ours. Kinde runs custom
page code only on a custom domain, so on the `*.kinde.com` domain its default pages show instead.

The user starts on their tenant (`app.visualdlp.com` or `ndx.visualdlp.com`), goes to
`login.visualdlp.com`, and comes back to the host they started on: the SPA's `redirect_uri` is
built from `window.location.host` in `kindeLoginService.js`.

### Kinde environments

There are two Kinde environments, and each needs its own sign-in host: a DNS name holds one CNAME, so
`login.visualdlp.com` can point at only one environment.

| Kinde environment | Sign-in host | VisualDLP hosts that use it |
|---|---|---|
| production | `login.visualdlp.com` | `app.visualdlp.com`, `ndx.visualdlp.com` |
| non-production | `login-dev.visualdlp.com` | `develop.visualdlp.com`, `qa.visualdlp.com`, preview slots |

Everything below is done once per environment, with that environment's values.

### Setup

In VisualDLP, on each deployment:

- `Kinde:Domain` = its environment's sign-in host, e.g. `https://login.visualdlp.com`. The SPA reads
  it, and `Kinde:SpaClientId` (that environment's SPA application), from the sign-in page
  VisualDLP's Oauth2Controller renders, and `/oauth2/session` exchanges the code there.
- `Kinde:WorkflowEncryptionKey` = that environment's workflow key (see the workflow setup above).

In Kinde, in each environment:

1. **Settings → Environment → Custom domain:** the environment's sign-in host. Kinde shows the CNAME
   records to create. `visualdlp.com` is on Cloudflare: add them to that zone as **DNS only** (grey
   cloud), not proxied, or Kinde cannot verify the domain or issue its certificate. Leave the
   verification record in place. If the zone has CAA records, they must allow both `letsencrypt.org`
   and `sectigo.com`.
2. **Brand settings** (Kinde's design section): upload the VisualDLP logo; the page shows it through
   `getLogoUrl()`.
3. **The SPA application → Allowed callback URLs:** `https://<host>/oauth2/kindecallback` for each
   VisualDLP host in the environment's row above. List production hosts one by one; Kinde accepts a
   `https://*.visualdlp.com/...` wildcard but recommends it only outside production, so it is
   acceptable in the non-production environment.

### Not yet settled

- **Someone who opens `login.visualdlp.com` directly** has no tenant to return to, and Kinde sends
  them only as far as whatever the application's default URL is. Set that to a tenant, or to a page
  that lets them choose.
- **A `.ca` tenant.** `login.visualdlp.com` is a different site from `*.visualdlp.ca`. A Kinde
  environment has one custom domain, so a `login.visualdlp.ca` needs its own Kinde environment;
  otherwise `.ca` users sign in on the `.com` domain. Each tenant's `Kinde:Domain` already selects its
  sign-in domain.
- **Both environments deploy from `main`,** so a change cannot run in non-production first. Pointing
  the non-production environment at another branch would allow that.
- **What `secureFetch` does with a 401.** The workflow treats a throw and an empty response the same
  way (refuse the sign-in), so either behaviour is handled, but it has not been observed.
- **Typings.** `@kinde/infrastructure` declares only `password` on this trigger's `context.auth` and
  types request bodies as `URLSearchParams`. The workflow uses the fields Kinde documents and the
  shapes in Kinde's own drip-feed example, with casts. `npm run typecheck` passes; nothing here has
  run inside Kinde.
- **Password changes after migration.** A password changed in VisualDLP after a user has migrated does
  not reach Kinde.
