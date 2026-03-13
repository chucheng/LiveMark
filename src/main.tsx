/* @refresh reload */
import { render } from "solid-js/web";
import App from "./ui/App";
import "./styles/variables.css";
import "./styles/reset.css";
import "./styles/editor.css";
import "./styles/app.css";
import "./styles/live-render.css";
import "./styles/status-bar.css";
import "./styles/command-palette.css";
import "./styles/find-replace.css";
import "./styles/source-view.css";
import "./styles/about.css";
import "katex/dist/katex.min.css";
import "prosemirror-gapcursor/style/gapcursor.css";

const root = document.getElementById("app");

if (!root) {
  throw new Error("Root element #app not found");
}

render(() => <App />, root);
