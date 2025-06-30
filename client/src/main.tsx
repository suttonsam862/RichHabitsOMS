import { createRoot } from "react-dom/client";
import App from "./App-debug";
import "./index.css";
import { fixWebSocketConnection } from './lib/fixWebSocketError'

// Fix WebSocket connection issues in Replit
fixWebSocketConnection()

createRoot(document.getElementById("root")!).render(<App />);