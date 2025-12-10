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
            baseBackgroundColor: "#f0f4ff",
            baseLinkColor: "#4338ca",
            buttonBorderRadius: "0.5rem",
            primaryButtonBackgroundColor: "#4338ca",
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
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              font-family: var(--kinde-base-font-family);
              min-height: 100vh;
            }
            
            .c-test-banner {
              background: linear-gradient(90deg, #f59e0b 0%, #ef4444 100%);
              color: white;
              text-align: center;
              padding: 0.75rem 1rem;
              font-weight: 600;
              font-size: 0.875rem;
              letter-spacing: 0.05em;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .c-container {
              padding: 2rem 1.5rem;
              display: flex;
              flex-direction: column;
              min-height: calc(100vh - 50px);
            }
            
            .c-header {
              text-align: center;
              margin-bottom: 2rem;
            }
            
            .c-header img {
              max-width: 150px;
              height: auto;
              filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
            }
            
            .c-main {
              flex: 1;
              display: flex;
              justify-content: center;
              align-items: flex-start;
              padding-top: 1rem;
            }
            
            .c-widget {
                max-width: 440px;
                width: 100%;
                background: white;
                border-radius: 1rem;
                padding: 2.5rem;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                border: 3px solid #4338ca;
            }
            
            .c-widget::before {
              content: "🧪 CUSTOM TEST PAGE";
              display: block;
              text-align: center;
              font-size: 0.75rem;
              font-weight: 700;
              color: #4338ca;
              background: #e0e7ff;
              margin: -2.5rem -2.5rem 1.5rem -2.5rem;
              padding: 0.75rem;
              border-radius: 0.75rem 0.75rem 0 0;
              letter-spacing: 0.1em;
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
              border-top: 1px solid rgba(255, 255, 255, 0.2);
              padding-block: 1.5rem;
              margin-top: 2rem;
              display: flex;
              justify-content: space-between;
              align-items: center;
              flex-wrap: wrap;
              gap: 1rem;
              color: white;
            }
            
            .c-no-account-link {
              margin: 0;
              font-size: 0.875rem;
              color: rgba(255, 255, 255, 0.9);
            }
            
            .c-no-account-link a {
              color: white;
              text-decoration: none;
              font-weight: 600;
              border-bottom: 2px solid rgba(255, 255, 255, 0.5);
            }
            
            .c-no-account-link a:hover {
              border-bottom-color: white;
            }
            
            .c-footer-links {
                display: flex;
                gap: 1.5rem;
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .c-footer-links a {
              color: rgba(255, 255, 255, 0.9);
              text-decoration: none;
              font-size: 0.875rem;
            }
            
            .c-footer-links a:hover {
              color: white;
            }
            
            @media (max-width: 640px) {
              .c-widget {
                padding: 2rem 1.5rem;
              }
              
              .c-widget::before {
                margin: -2rem -1.5rem 1.5rem -1.5rem;
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
        <div className="c-test-banner">
          ⚠️ TESTING MODE - Workflow-Only Migration Test Environment
        </div>
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