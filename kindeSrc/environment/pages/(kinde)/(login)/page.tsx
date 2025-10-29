"use server";

import React from "react";
import { renderToString } from "react-dom/server.browser";
import {
  getKindeRequiredCSS,
  getKindeRequiredJS,
  getKindeNonce,
  getKindeWidget,
  getKindeCSRF,
  getLogoUrl,
  getSVGFaviconUrl,
  setKindeDesignerCustomProperties,
  getKindeRegisterUrl,
} from "@kinde/infrastructure";

const Layout = async ({ request, context }: any) => {
  return (
    <html lang={request.locale.lang} dir={request.locale.isRtl ? "rtl" : "ltr"}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        <meta name="csrf-token" content={getKindeCSRF()} />
        <title>{context.widget.content.page_title || "Sign In"}</title>

        <link rel="icon" href={getSVGFaviconUrl()} type="image/svg+xml" />
        {getKindeRequiredCSS()}
        {getKindeRequiredJS()}
        <style nonce={getKindeNonce()}>
          {`:root {
          ${setKindeDesignerCustomProperties({
            baseBackgroundColor: "#f8f9fa",
            baseLinkColor: "#230078",
            buttonBorderRadius: "0.5rem",
            primaryButtonBackgroundColor: "#230078",
            primaryButtonColor: "#fff",
            inputBorderRadius: "0.5rem"
          })}}
          `}
        </style>
        <style nonce={getKindeNonce()}>
          {`
            :root {
                --kinde-base-color: rgb(12, 0, 32);
                --kinde-base-font-family: -apple-system, system-ui, BlinkMacSystemFont, Helvetica, Arial, Segoe UI, Roboto, sans-serif;
            }

            [data-kinde-control-select-text]{
                background-color: rgb(250, 250, 251);
            }
            
            body {
              margin: 0;
              padding: 0;
              background-color: #f8f9fa;
              font-family: var(--kinde-base-font-family);
            }
            
            .c-container {
              padding: 2rem 1.5rem;
              display: flex;
              flex-direction: column;
              min-height: 100vh;
            }
            
            .c-header {
              text-align: center;
              margin-bottom: 3rem;
            }
            
            .c-header img {
              max-width: 150px;
              height: auto;
            }
            
            .c-main {
              flex: 1;
              display: flex;
              justify-content: center;
              align-items: flex-start;
              padding-top: 2rem;
            }
            
            .c-widget {
                max-width: 420px;
                width: 100%;
                background: white;
                border-radius: 0.75rem;
                padding: 2.5rem;
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
            }
            
            .c-widget h1 {
              margin-top: 0;
              margin-bottom: 0.5rem;
              font-size: 1.875rem;
              font-weight: 700;
              color: var(--kinde-base-color);
            }
            
            .c-widget > p {
              margin-top: 0;
              margin-bottom: 1.5rem;
              color: #6b7280;
              font-size: 0.975rem;
            }
            
            .c-footer {
              border-top: 1px solid rgba(12, 0, 32, 0.08);
              padding-block: 1.5rem;
              margin-top: 3rem;
              display: flex;
              justify-content: space-between;
              align-items: center;
              flex-wrap: wrap;
              gap: 1rem;
            }
            
            .c-no-account-link {
              margin: 0;
              font-size: 0.875rem;
              color: #6b7280;
            }
            
            .c-no-account-link a {
              color: var(--kinde-base-link-color, #230078);
              text-decoration: none;
              font-weight: 500;
            }
            
            .c-no-account-link a:hover {
              text-decoration: underline;
            }
            
            .c-footer-links {
                display: flex;
                gap: 1.5rem;
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .c-footer-links a {
              color: #6b7280;
              text-decoration: none;
              font-size: 0.875rem;
            }
            
            .c-footer-links a:hover {
              color: var(--kinde-base-color);
            }
            
            @media (max-width: 640px) {
              .c-widget {
                padding: 2rem 1.5rem;
              }
              
              .c-footer {
                flex-direction: column;
                text-align: center;
              }
            }
          `}
        </style>
      </head>
      <body>
        <div data-kinde-root="true" className="c-container">
          <header className="c-header">
            <img src={getLogoUrl()} alt={context.widget.content.logo_alt || "Logo"} />
          </header>
          <main className="c-main">
            <div className="c-widget">
              <h1>{context.widget.content.heading || "Sign in"}</h1>
              <p>{context.widget.content.description || "Welcome back! Please sign in to continue."}</p>
              <div>{getKindeWidget()}</div>
            </div>
          </main>
          <footer className="c-footer">
            <p className="c-no-account-link">
              No account? <a href={getKindeRegisterUrl()}>Sign up for free</a>
            </p>
            <ul className="c-footer-links">
              <li>
                <a href="">Privacy</a>
              </li>
              <li>
                <a href="">Terms</a>
              </li>
              <li>
                <a href="">Get help</a>
              </li>
            </ul>
          </footer>
        </div>
      </body>
    </html>
  );
};

export default async function Page(event: any) {
  const page = await Layout({ ...event });
  return renderToString(page);
}

