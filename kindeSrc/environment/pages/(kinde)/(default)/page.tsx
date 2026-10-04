"use server";

import { getKindeWidget, getLogoUrl, type KindePageEvent } from "@kinde/infrastructure";
import React from "react";
import { renderToString } from "react-dom/server.browser";
import { Root } from "../../../../components/root";

// The page Kinde falls back to for any sign-in screen without a page of its own.
// Kinde renders its own form where getKindeWidget() is placed; everything around it is ours. The logo
// is the one uploaded in Kinde's brand settings, so the page does not depend on a VisualDLP host.

// Pages apply to every application in the Kinde environment. The VisualDLP footer shows only when the
// sign-in will return to a VisualDLP host; any other application gets the card without it.
const returnsToVisualDlp = (redirectUri: string | undefined): boolean => {
  try {
    const host = new URL(redirectUri ?? "").hostname;
    return host === "visualdlp.com" || host.endsWith(".visualdlp.com") || host === "localhost";
  } catch {
    return false;
  }
};

const VisualDlpFooter = (): React.JSX.Element => (
  <footer className="vdlp-footer">
    <div>
      <strong>VisualDLP</strong> - Dental Lab Management
    </div>
    <div>Copyright 2015-{new Date().getFullYear()} EasyRx, LLC</div>
    <div>
      By signing in, you agree to our{" "}
      <a href="https://jenmarinternational.com/terms-of-service/" rel="noopener" target="_blank">
        Terms of Service
      </a>
      ,{" "}
      <a href="https://jenmarinternational.com/privacy-policy-2/" rel="noopener" target="_blank">
        Privacy Policy
      </a>{" "}
      and our{" "}
      <a href="https://jenmarinternational.com/business-associate-agreement/" rel="noopener" target="_blank">
        Business Associate Agreement
      </a>
      .
    </div>
  </footer>
);

const DefaultPage = ({ context, request }: KindePageEvent): React.JSX.Element => {
  const isVisualDlp = returnsToVisualDlp(request.authUrlParams?.redirectUri);
  return (
    <Root context={context} request={request}>
      <div className="vdlp-page">
        <main className="vdlp-card">
          <img alt={context.widget.content.logoAlt || ""} className="vdlp-logo" src={getLogoUrl()} />
          <h1 className="vdlp-heading">{context.widget.content.heading}</h1>
          <p className="vdlp-description">{context.widget.content.description}</p>
          {getKindeWidget()}
        </main>

        {isVisualDlp && <VisualDlpFooter />}
      </div>
    </Root>
  );
};

export default async function Page(event: KindePageEvent): Promise<string> {
  return renderToString(DefaultPage(event));
}
