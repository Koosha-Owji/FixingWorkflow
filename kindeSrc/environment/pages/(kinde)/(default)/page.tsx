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
} from "@kinde/infrastructure";

const Layout = async ({ request, context }: any) => {
  return (
    <html lang={request.locale.lang} dir={request.locale.isRtl ? "rtl" : "ltr"}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        <meta name="csrf-token" content={getKindeCSRF()} />
        <title>{context.widget.content.page_title}</title>

        <link rel="icon" href={getSVGFaviconUrl()} type="image/svg+xml" />
        {getKindeRequiredCSS()}
        {getKindeRequiredJS()}
        <style nonce={getKindeNonce()}>
          {`:root {
          ${setKindeDesignerCustomProperties({
            baseBackgroundColor: "#fff",
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
            .c-container {
              padding: 1.5rem;
              display: grid;
              gap: 2rem;
              min-height: 100vh;
            }
            .c-widget {
                max-width: 400px;
                width: 100%;
                margin: 0px auto;
            }
            .c-footer {
              border-top: 1px solid rgba(12, 0, 32, 0.08);
              padding-block: 1.5rem;
              display: flex;
              justify-content: space-between;
            }
            .c-footer-links {
                display: flex;
                gap: 1.5rem;
                list-style: none;
                padding: 0;
                margin: 0;
            }
            .c-header {
              text-align: center;
            }
            body {
              margin: 0;
              padding: 0;
            }
          `}
        </style>
      </head>
      <body>
        <div data-kinde-root="/admin" className="c-container">
          <header className="c-header">
            <img src={getLogoUrl()} alt={context.widget.content.logo_alt} />
          </header>
          <main>
            <div className="c-widget">
              <h1>{context.widget.content.heading}</h1>
              <p>{context.widget.content.description}</p>
              <div>{getKindeWidget()}</div>
            </div>
          </main>
          <footer className="c-footer">
            <p>
              &copy; 2025 - Powered by Kinde
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

