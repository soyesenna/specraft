import "./styles.css"

const milestones = [
  "pnpm workspace",
  "Fastify health",
  "React/Vite shell",
  "shared contracts",
] as const

export function App() {
  return (
    <main className="app-shell">
      <nav className="global-nav" aria-label="specraft">
        <span className="nav-mark">specraft</span>
        <span className="nav-status">M1</span>
      </nav>

      <section className="hero-section" aria-labelledby="specraft-title">
        <p className="eyebrow">Single spec source for agentic development</p>
        <h1 id="specraft-title">specraft</h1>
        <p className="hero-copy">
          M1 계약 고정
          <span>Fastify, React/Vite, shared contracts</span>
        </p>
      </section>

      <section className="contract-band" aria-label="M1 status">
        {milestones.map((milestone) => (
          <article className="status-tile" key={milestone}>
            <span className="tile-dot" aria-hidden="true" />
            <h2>{milestone}</h2>
            <p>Ready for downstream milestone integration.</p>
          </article>
        ))}
      </section>
    </main>
  )
}
