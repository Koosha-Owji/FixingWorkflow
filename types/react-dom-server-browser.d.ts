// @types/react-dom 18 has no typings for the server.browser entry the Kinde pages import; it exports
// the same renderToString as react-dom/server.
declare module "react-dom/server.browser" {
  export { renderToString } from "react-dom/server";
}
