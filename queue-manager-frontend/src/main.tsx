import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@api-client";

// In production, VITE_API_URL points to the Render backend.
// In dev, it's empty so relative /api paths go through Vite's proxy.
const apiUrl = import.meta.env.VITE_API_URL ?? "";
setBaseUrl(apiUrl || null);

createRoot(document.getElementById("root")!).render(<App />);
