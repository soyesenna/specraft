import { createRoot } from "react-dom/client"

import { App } from "./App.js"

const rootElement = document.getElementById("root")

if (!rootElement) {
  throw new Error("frontend root element is missing")
}

createRoot(rootElement).render(<App />)
