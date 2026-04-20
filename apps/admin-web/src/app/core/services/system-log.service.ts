// apps/admin-web/src/app/core/services/system-log.service.ts
import { Injectable, signal, computed } from '@angular/core';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  id: number;
  level: LogLevel;
  message: string;
  detail?: string;
  timestamp: Date;
}

const MAX_ENTRIES = 500;
let _seq = 0;

@Injectable({ providedIn: 'root' })
export class SystemLogService {
  private readonly _entries = signal<LogEntry[]>([]);
  private readonly _filter = signal<LogLevel | 'ALL'>('ALL');

  readonly entries = this._entries.asReadonly();
  readonly filter = this._filter.asReadonly();

  readonly filtered = computed(() => {
    const f = this._filter();
    return f === 'ALL'
      ? this._entries()
      : this._entries().filter(e => e.level === f);
  });

  readonly errorCount = computed(() =>
    this._entries().filter(e => e.level === 'ERROR').length,
  );
  readonly warnCount = computed(() =>
    this._entries().filter(e => e.level === 'WARN').length,
  );

  constructor() {
    this._interceptConsole();
  }

  debug(message: string, detail?: string) {
    this._push('DEBUG', message, detail);
  }

  info(message: string, detail?: string) {
    this._push('INFO', message, detail);
  }

  warn(message: string, detail?: string) {
    this._push('WARN', message, detail);
  }

  error(message: string, detail?: string) {
    this._push('ERROR', message, detail);
  }

  setFilter(f: LogLevel | 'ALL') {
    this._filter.set(f);
  }

  clear() {
    this._entries.set([]);
  }

  private _push(level: LogLevel, message: string, detail?: string) {
    const entry: LogEntry = { id: ++_seq, level, message, detail, timestamp: new Date() };
    this._entries.update(prev => {
      const next = [...prev, entry];
      return next.length > MAX_ENTRIES ? next.slice(next.length - MAX_ENTRIES) : next;
    });
  }

  /** Intercept console.* so native browser logs also appear in the panel */
  private _interceptConsole() {
    const orig = {
      log:   console.log.bind(console),
      debug: console.debug.bind(console),
      info:  console.info.bind(console),
      warn:  console.warn.bind(console),
      error: console.error.bind(console),
    };

    const fmt = (args: unknown[]) =>
      args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ');

    console.log   = (...a) => { orig.log(...a);   this._push('DEBUG', fmt(a)); };
    console.debug = (...a) => { orig.debug(...a); this._push('DEBUG', fmt(a)); };
    console.info  = (...a) => { orig.info(...a);  this._push('INFO',  fmt(a)); };
    console.warn  = (...a) => { orig.warn(...a);  this._push('WARN',  fmt(a)); };
    console.error = (...a) => { orig.error(...a); this._push('ERROR', fmt(a)); };
  }
}
