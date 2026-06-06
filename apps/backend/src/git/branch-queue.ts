type BranchJob<T> = () => Promise<T>

export class BranchQueue {
  private readonly queues = new Map<string, Promise<void>>()

  async run<T>(branch: string, job: BranchJob<T>): Promise<T> {
    const previous = this.queues.get(branch) ?? Promise.resolve()
    const result = previous.catch(() => undefined).then(job)
    const idle = result.then(
      () => undefined,
      () => undefined,
    )
    this.queues.set(branch, idle)
    try {
      return await result
    } finally {
      if (this.queues.get(branch) === idle) {
        this.queues.delete(branch)
      }
    }
  }
}
