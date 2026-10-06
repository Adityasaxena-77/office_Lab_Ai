import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { FilterProvider } from "./state/FilterContext.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <FilterProvider>
    <App />
  </FilterProvider>
);
