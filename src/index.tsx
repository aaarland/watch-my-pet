/* @refresh reload */
import { render } from "solid-js/web";

import "./index.css";
import App from "./App";

const root = document.getElementById("root");

//biome-ignore lint/style/noNonNullAssertion: it's defined
render(() => <App />, root!);
