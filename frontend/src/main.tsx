import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { MotionConfig } from "framer-motion";
import App from "./App";
import { queryClient } from "./lib/queryClient";
import "./styles/globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {/* Honor the OS "reduce motion" setting for every framer-motion
            component app-wide: transform/layout animations are suppressed
            (opacity is kept) when the user prefers reduced motion. */}
        <MotionConfig reducedMotion="user">
          <App />
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </MotionConfig>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
);
