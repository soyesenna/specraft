import { render } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { App } from "./App.js"

test("App이 라우터 안에서 크래시 없이 렌더된다", () => {
  const { container } = render(
    <MemoryRouter initialEntries={["/specs"]}>
      <App />
    </MemoryRouter>,
  )
  expect(container).toBeTruthy()
})
