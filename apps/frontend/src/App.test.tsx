import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { App } from "./App.js"

describe("frontend shell", () => {
  it("renders M1 frontend shell", () => {
    render(<App />)

    expect(screen.getByRole("heading", { name: "specraft" })).toBeTruthy()
    expect(screen.getByText("M1 계약 고정")).toBeTruthy()
    expect(screen.getByText("Fastify, React/Vite, shared contracts")).toBeTruthy()
  })
})
