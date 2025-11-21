/**
 * Structured logging utilities for RoboOS SDK
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

export type Logger = {
  debug: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (
    message: string,
    error?: Error,
    context?: Record<string, unknown>
  ) => void;
};

class ConsoleLogger implements Logger {
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = LogLevel.INFO) {
    this.minLevel = minLevel;
  }

  private log(
    level: LogLevel,
    message: string,
    error?: Error,
    context?: Record<string, unknown>
  ) {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    };

    const logMethod = this.getLogMethod(level);
    const prefix = `[${LogLevel[level]}] ${entry.timestamp}`;

    if (error) {
      logMethod(prefix, message, {
        ...context,
        error: error.message,
        stack: error.stack,
      });
    } else if (context) {
      logMethod(prefix, message, context);
    } else {
      logMethod(prefix, message);
    }
  }

  private getLogMethod(level: LogLevel) {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
        return console.error;
      default:
        return console.log;
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.DEBUG, message, undefined, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.INFO, message, undefined, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.WARN, message, undefined, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>) {
    this.log(LogLevel.ERROR, message, error, context);
  }
}

let defaultLogger: Logger = new ConsoleLogger();

export function setLogger(logger: Logger) {
  defaultLogger = logger;
}

export function setLogLevel(level: LogLevel) {
  defaultLogger = new ConsoleLogger(level);
}

export function getLogger(): Logger {
  return defaultLogger;
}

export function createLogger(minLevel: LogLevel = LogLevel.INFO): Logger {
  return new ConsoleLogger(minLevel);
}
