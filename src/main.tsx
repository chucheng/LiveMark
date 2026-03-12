/* @refresh reload */
import { render } from "solid-js/web";
import App from "./ui/App";
import "./styles/variables.css";
import "./styles/reset.css";
import "./styles/editor.css";
import "./styles/app.css";

const root = document.getElementById("app");

if (!root) {
  throw new Error("Root element #app not found");
}

render(() => <App />, root);
