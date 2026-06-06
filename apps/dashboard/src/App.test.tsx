import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { App } from "./App.js"

describe("dashboard shell", () => {
  it("renders M1 dashboard shell", () => {
    render(<App />)

    expect(screen.getByRole("heading", { name: "specraft" })).toBeTruthy()
    expect(screen.getByText("M1 계약 고정")).toBeTruthy()
    expect(screen.getByText("Fastify, React/Vite, shared contracts")).toBeTruthy()
  })
})
