import { createRoot } from "react-dom/client";
import { router } from "./App.tsx";
import "./index.css";
import { RouterProvider } from "react-router";

/**
 * Mount immediately. FOUC is already mitigated at the network/CSS layer:
 *  - Critical fonts are <link rel="preload"> with fetchpriority="high" in index.html
 *    so they download in parallel with the JS bundle.
 *  - @font-face uses font-display: block, so the browser holds a brief invisible
 *    paint window for real text rather than swapping mid-render.
 *
 * Previously we blocked React mount on document.fonts.ready (capped at 400ms).
 * That was up to 400ms of pure stall on cold start when fonts came in slightly
 * after the JS — pure waste since the boot skeleton uses system fonts anyway.
 */
createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);

