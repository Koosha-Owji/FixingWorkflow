"use server";

import {
  getKindeCSRF,
  getKindeNonce,
  getKindeRequiredCSS,
  getKindeRequiredJS,
  getKindeWidget,
  type KindePageEvent,
} from "@kinde/infrastructure";
import React from "react";
import { renderToString } from "react-dom/server.browser";

// Test page for the root of the custom domain: which ways of redirecting a visitor away work on a
// Kinde-hosted page. A page can only return HTML, so there is no way to send a real 302 from here.
// The page reports whether inline scripts run with and without Kinde's nonce, shows the CSP header it
// was served with, offers a JavaScript redirect button, and redirects itself with a meta refresh
// after metaRefreshSeconds.
const target = "https://example.com/?from=kinde-index";
const metaRefreshSeconds = 0;

// Runs only if the CSP allows inline scripts carrying Kinde's nonce.
const nonceScript = `
  document.getElementById("nonce-result").textContent = "Ran";
  document.getElementById("js-redirect").addEventListener("click", function () {
    window.location.replace(${JSON.stringify(target + "&via=js")});
  });
  var left = ${metaRefreshSeconds};
  setInterval(function () {
    if (left > 0) document.getElementById("countdown").textContent = String(--left);
  }, 1000);
  fetch(window.location.href, { credentials: "same-origin" })
    .then(function (r) {
      document.getElementById("csp").textContent =
        r.headers.get("content-security-policy") || "(no Content-Security-Policy header)";
    })
    .catch(function (e) {
      document.getElementById("csp").textContent = "Could not read: " + e;
    });
`;

// Runs only if the CSP allows inline scripts without a nonce.
const noNonceScript = `document.getElementById("no-nonce-result").textContent = "Ran";`;

const row = (label: string, id: string, initial: string): React.JSX.Element => (
  <tr>
    <th style={{ textAlign: "left", padding: "4px 12px 4px 0" }}>{label}</th>
    <td id={id}>{initial}</td>
  </tr>
);

const IndexRedirectTest = ({ context, request }: KindePageEvent): React.JSX.Element => (
  <html dir={request.locale.isRtl ? "rtl" : "ltr"} lang={request.locale.lang}>
    <head>
      <meta charSet="utf-8" />
      <meta content="width=device-width, initial-scale=1.0" name="viewport" />
      <meta content="noindex" name="robots" />
      <meta content={getKindeCSRF()} name="csrf-token" />
      <meta content={`${metaRefreshSeconds};url=${target}&via=meta`} httpEquiv="refresh" />
      <title>Index redirect test</title>
      {getKindeRequiredCSS()}
      {getKindeRequiredJS()}
      <style nonce={getKindeNonce()}>{`
        body { font-family: system-ui, sans-serif; margin: 2rem; line-height: 1.5; }
        code, pre { background: #f3f3f3; padding: 2px 4px; white-space: pre-wrap; word-break: break-all; }
      `}</style>
    </head>
    <body>
      <div data-kinde-root="true">
        <h1>Index redirect test</h1>

        <table>
          <tbody>
            {row("Inline script with Kinde's nonce", "nonce-result", "Blocked (or JavaScript is off)")}
            {row("Inline script without a nonce", "no-nonce-result", "Blocked (or JavaScript is off)")}
          </tbody>
        </table>

        <p>
          <button id="js-redirect" type="button">
            Redirect with JavaScript
          </button>
        </p>

        <p>
          Meta refresh to <code>{target}&amp;via=meta</code> in <strong id="countdown">{metaRefreshSeconds}</strong>{" "}
          seconds.
        </p>

        <h2>Content-Security-Policy</h2>
        <pre id="csp">(needs the nonce script to run)</pre>

        <h2>What Kinde passed to this page</h2>
        <pre>{JSON.stringify({ route: request.route, authUrlParams: request.authUrlParams, content: context.widget.content }, null, 2)}</pre>

        {getKindeWidget()}

        <script dangerouslySetInnerHTML={{ __html: nonceScript }} nonce={getKindeNonce()} />
        <script dangerouslySetInnerHTML={{ __html: noNonceScript }} />
      </div>
    </body>
  </html>
);

export default async function Page(event: KindePageEvent): Promise<string> {
  return renderToString(<IndexRedirectTest {...event} />);
}
