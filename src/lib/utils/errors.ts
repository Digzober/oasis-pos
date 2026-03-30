export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public cause?: unknown,
    public statusCode: number = 400
  ) {
    super(message)
    this.name = 'AppError'
  }
}
