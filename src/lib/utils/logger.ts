type LogContext = Record<string, unknown>

function formatLog(level: string, message: string, context?: LogContext): string {
  return JSON.stringify({
    level,
    message,
    ...context,
    timestamp: new Date().toISOString(),
  })
}

export const logger = {
  info: (message: string, context?: LogContext) => {
    console.log(formatLog('info', message, context))
  },
  warn: (message: string, context?: LogContext) => {
    console.warn(formatLog('warn', message, context))
  },
  error: (message: string, context?: LogContext) => {
    console.error(formatLog('error', message, context))
  },
}
