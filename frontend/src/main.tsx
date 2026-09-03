import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles/base.css";
import "./styles/seats.css";
import "./styles/felt.css";
import "./styles/placement.css";
import "./styles/controls.css";
import "./styles/pages.css";
import "./styles/coach-panel.css";
import "./styles/review.css";
import "./styles/explanations.css";
import "./styles/coach-analyzer.css";
import "./styles/cards.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
