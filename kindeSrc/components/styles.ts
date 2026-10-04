// VisualDLP's look on Kinde's pages. The primary colour is jenmarBlue 500 from the VisualDLP repo's
// dlp.web.cloud/client/scripts/app/common/directives/configMaterialTheme.js; the font is the Roboto
// the app's login layout loads, falling back to the system stack where it is not installed.
const vdlp = {
  primary: "#0779AA",
  text: "rgba(0, 0, 0, 0.87)",
  mutedText: "rgba(0, 0, 0, 0.54)",
  background: "#fafafa",
  fontFamily: "Roboto, 'Helvetica Neue', -apple-system, system-ui, 'Segoe UI', Arial, sans-serif",
} as const;

export const getStyles = (): string => `
  :root {
    --kinde-base-font-family: ${vdlp.fontFamily};
    --kinde-button-primary-background-color: ${vdlp.primary};
    --kinde-button-primary-color: #fff;
    --kinde-button-border-radius: 2px;
    --kinde-button-secondary-background-color: #fff;
    --kinde-button-secondary-border-width: 1px;
    --kinde-button-secondary-border-color: rgba(0, 0, 0, 0.12);
    --kinde-button-secondary-border-style: solid;
    --kinde-button-secondary-border-radius: 2px;
    --kinde-control-select-text-border-radius: 2px;
  }

  html, body {
    margin: 0;
    background: ${vdlp.background};
    color: ${vdlp.text};
    font-family: ${vdlp.fontFamily};
  }

  a {
    color: ${vdlp.primary};
  }

  .vdlp-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
    box-sizing: border-box;
  }

  .vdlp-card {
    width: 100%;
    max-width: 400px;
    background: #fff;
    border-radius: 2px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2), 0 1px 1px rgba(0, 0, 0, 0.14), 0 2px 1px -1px rgba(0, 0, 0, 0.12);
    padding: 2rem;
    box-sizing: border-box;
  }

  .vdlp-logo {
    display: block;
    max-width: 240px;
    max-height: 80px;
    margin: 0 auto 1.5rem;
  }

  .vdlp-heading {
    font-size: 1.5rem;
    font-weight: 500;
    margin: 0 0 0.5rem;
  }

  .vdlp-description {
    color: ${vdlp.mutedText};
    margin: 0 0 1.5rem;
  }

  .vdlp-footer {
    margin-top: 1.5rem;
    text-align: center;
    font-size: 0.8rem;
    color: ${vdlp.mutedText};
    line-height: 1.5;
  }
`;
