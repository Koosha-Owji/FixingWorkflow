"use server";

import {
  getKindeCSRF,
  getKindeNonce,
  getKindeRequiredCSS,
  getKindeRequiredJS,
  getSVGFaviconUrl,
  type KindePageEvent,
} from "@kinde/infrastructure";
import React from "react";
import { getStyles } from "./styles";

interface RootProps extends KindePageEvent {
  children: React.ReactNode;
}

// Kinde's docs name the field page_title; @kinde/infrastructure's typings name it pageTitle.
const pageTitle = (content: KindePageEvent["context"]["widget"]["content"]): string =>
  (content as unknown as { page_title?: string }).page_title ?? content.pageTitle ?? "Sign in";

// The document shell every Kinde-hosted page on login.visualdlp.com renders into. Kinde requires the
// CSRF meta tag, its CSS and JS, and the data-kinde-root container.
export const Root = ({ children, context, request }: RootProps): React.JSX.Element => {
  return (
    <html dir={request.locale.isRtl ? "rtl" : "ltr"} lang={request.locale.lang}>
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1.0" name="viewport" />
        <meta content="noindex" name="robots" />
        <meta content={getKindeCSRF()} name="csrf-token" />
        <meta content="light" name="color-scheme" />
        <title>{pageTitle(context.widget.content)}</title>

        <link href={getSVGFaviconUrl()} rel="icon" type="image/svg+xml" />
        {getKindeRequiredCSS()}
        {getKindeRequiredJS()}
        <style nonce={getKindeNonce()}>{getStyles()}</style>
      </head>

      <body>
        <div data-kinde-root="true">{children}</div>
      </body>
    </html>
  );
};
