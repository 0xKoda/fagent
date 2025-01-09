/**
 * Logging Utility
 * Provides centralized logging functionality with different log levels:
 * - debug: Detailed debugging information
 * - info: General information about application flow
 * - warn: Warning messages for potentially problematic situations
 * - error: Error messages for serious problems
 */
export class Logger {
  private static logs: string[] = [];

  static debug(...args: any[]) {
    this.log('DEBUG', ...args);
  }

  static info(...args: any[]) {
    this.log('INFO', ...args);
  }

  static warn(...args: any[]) {
    this.log('WARN', ...args);
  }

  static error(...args: any[]) {
    this.log('ERROR', ...args);
  }

  private static log(level: string, ...args: any[]) {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    const logEntry = `[${level}] ${message}`;
    this.logs.push(logEntry);
    
    switch (level) {
      case 'ERROR':
        console.error(...args);
        break;
      default:
        console.log(...args);
    }
  }

  static getLogs() {
    return this.logs.join('\n');
  }

  static clear() {
    this.logs = [];
  }
}
