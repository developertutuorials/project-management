import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { store } from "./app/store.js";
import { Provider } from "react-redux";
import { ClerkProvider } from "@clerk/react";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  createRoot(document.getElementById("root")).render(
    <div style={{ padding: "40px", fontFamily: "system-ui, -apple-system, sans-serif", maxWidth: "600px", margin: "60px auto", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", background: "#ffffff" }}>
      <h2 style={{ color: "#dc2626", marginTop: 0, display: "flex", alignItems: "center", gap: "8px" }}>
        ⚠️ Missing Clerk Publishable Key
      </h2>
      <p style={{ color: "#475569", lineHeight: "1.6" }}>
        The frontend cannot load without a <strong>Clerk Publishable Key</strong> for authentication.
      </p>
      <p style={{ color: "#475569", lineHeight: "1.6" }}>
        Add your key to <code>client/.env</code>:
      </p>
      <pre style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "14px", borderRadius: "8px", overflowX: "auto", fontSize: "14px", color: "#0f172a" }}>
{`VITE_BASEURL=http://localhost:4000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here`}
      </pre>
      <p style={{ color: "#64748b", fontSize: "14px", marginTop: "16px" }}>
        Get your free API key at <a href="https://dashboard.clerk.com" target="_blank" rel="noreferrer" style={{ color: "#2563eb", textDecoration: "underline" }}>dashboard.clerk.com</a> &rarr; API Keys.
      </p>
    </div>
  );
  console.error("TaskFlow Error: Missing VITE_CLERK_PUBLISHABLE_KEY in client/.env");
} else {
  createRoot(document.getElementById("root")).render(
    <BrowserRouter>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/sign-in">
        <Provider store={store}>
          <App />
        </Provider>
      </ClerkProvider>
    </BrowserRouter>,
  );
}
