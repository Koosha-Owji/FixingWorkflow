"use server";

import React from "react";
import { renderToString } from "react-dom/server.browser";
import {
  getKindeRequiredCSS,
  getKindeRequiredJS,
  getKindeNonce,
  getKindeWidget,
  getKindeCSRF,
} from "@kinde/infrastructure";

const CUSTOM_MESSAGES = {
  firstPassword:
    "Password must be at least 12 characters and include upper, lower, number, and symbol.",
  secondPassword: "Passwords must match.",
};

const Script = () => {
  const js = `
  (function(){
    const SELECTORS = {
      field: '[data-kinde-form-field]',
      message: '[data-kinde-control-associated-text]',
      first: 'input[name="p_first_password"]',
      second: 'input[name="p_second_password"]',
    };

    function getFieldContainer(input){
      let el = input;
      while (el && el !== document.body) {
        if (el.matches && el.matches(SELECTORS.field)) return el;
        el = el.parentElement;
      }
      return null;
    }

    function setMessageForInput(input, text){
      const field = getFieldContainer(input);
      if (!field) return;
      let msg = field.querySelector(SELECTORS.message);
      if (!msg) return;
      msg.textContent = text;
    }

    function rewriteIfInvalid(){
      const first = document.querySelector(SELECTORS.first);
      const second = document.querySelector(SELECTORS.second);

      if (first && (first.getAttribute('aria-invalid') === 'true')) {
        setMessageForInput(first, ${JSON.stringify(CUSTOM_MESSAGES.firstPassword)});
      }
      if (second && (second.getAttribute('aria-invalid') === 'true')) {
        setMessageForInput(second, ${JSON.stringify(CUSTOM_MESSAGES.secondPassword)});
      }
    }

    const obs = new MutationObserver((mutations) => {
      let shouldCheck = false;
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'aria-invalid') { shouldCheck = true; break; }
        if (m.type === 'childList') { shouldCheck = true; break; }
      }
      if (shouldCheck) rewriteIfInvalid();
    });
    obs.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-invalid'] });
    document.addEventListener('input', rewriteIfInvalid, true);
    document.addEventListener('change', rewriteIfInvalid, true);
    rewriteIfInvalid();
  })();`;

  return (
    <script nonce={getKindeNonce()} dangerouslySetInnerHTML={{ __html: js }} />
  );
};

const Layout = async ({ request, context }: any) => {
  return (
    <html lang={request.locale.lang} dir={request.locale.isRtl ? "rtl" : "ltr"}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="csrf-token" content={getKindeCSRF()} />
        <title>{context.widget.content.page_title}</title>
        {getKindeRequiredCSS()}
        {getKindeRequiredJS()}
      </head>
      <body>
        <main data-kinde-root="true">
          {getKindeWidget()}
        </main>
        <Script />
      </body>
    </html>
  );
};

export default async function Page(event: any) {
  const page = await Layout({ ...event });
  return renderToString(page);
}


