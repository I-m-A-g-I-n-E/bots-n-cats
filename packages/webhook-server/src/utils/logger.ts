/**
 * Structured logging utility
 * BOC-1: Webhook server logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

/**
 * Simple structured logger for webhook server
 */
export class Logger {
  private static formatTimestamp(): string {
    return new Date().toISOString();
  }

  private static log(level: LogLevel, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      message,
    };

    if (data !== undefined) {
      entry.data = data;
    }

    const logMethod = level === 'error' ? console.error :
                      level === 'warn' ? console.warn :
                      console.log;

    // In production, this would go to a structured logging service
    // For now, output as JSON for easy parsing
    if (process.env.NODE_ENV === 'production') {
      logMethod(JSON.stringify(entry));
    } else {
      // Development: more readable format
      const dataStr = data ? ` ${JSON.stringify(data, null, 2)}` : '';
      logMethod(`[${entry.timestamp}] ${level.toUpperCase()}: ${message}${dataStr}`);
    }
  }

  static debug(message: string, data?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      this.log('debug', message, data);
    }
  }

  static info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  static warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  static error(message: string, error?: any): void {
    const data = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error;
    this.log('error', message, data);
  }

  /**
   * Log webhook event received
   */
  static webhook(eventType: string, action: string, metadata?: any): void {
    this.info('Webhook event received', {
      eventType,
      action,
      ...metadata,
    });
  }

  /**
   * Log event published to AudioEventBus
   */
  static eventPublished(eventName: string, emotion: string, intensity: number): void {
    this.debug('Event published to AudioEventBus', {
      eventName,
      emotion,
      intensity,
    });
  }

  /**
   * Log server startup
   */
  static serverStarted(port: number): void {
    this.info(`Webhook server started on port ${port}`);
  }

  /**
   * Log server shutdown
   */
  static serverStopped(): void {
    this.info('Webhook server stopped');
  }
}
