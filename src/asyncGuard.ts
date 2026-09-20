export class OperationTimeoutError extends Error {
  readonly operation: string

  constructor(operation: string) {
    super(`${operation}_timeout`)
    this.name = 'OperationTimeoutError'
    this.operation = operation
  }
}

export function withTimeout<T>(promise: Promise<T>, milliseconds: number, operation = 'operation'): Promise<T> {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return promise

  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new OperationTimeoutError(operation)), milliseconds)
    promise.then(
      value => {
        window.clearTimeout(timer)
        resolve(value)
      },
      error => {
        window.clearTimeout(timer)
        reject(error)
      },
    )
  })
}
