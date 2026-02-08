import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LogLevel, setLogLevel, setRunContext, debug, info, warn, error } from './logger.js';

describe('logger', () => {
  let consoleDebugSpy: any;
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    // Reset to default level
    setLogLevel(LogLevel.INFO);
    setRunContext(undefined, undefined);
    
    // Mock console methods
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore mocks
    consoleDebugSpy?.mockRestore();
    consoleLogSpy?.mockRestore();
    consoleWarnSpy?.mockRestore();
    consoleErrorSpy?.mockRestore();
    
    // Reset env
    delete process.env.LOG_FORMAT;
  });

  describe('log levels', () => {
    it('should respect log level filtering', () => {
      setLogLevel(LogLevel.WARN);
      
      debug('test', 'debug message');
      info('test', 'info message');
      warn('test', 'warn message');
      error('test', 'error message');
      
      expect(console.debug).not.toHaveBeenCalled();
      expect(console.log).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledOnce();
      expect(console.error).toHaveBeenCalledOnce();
    });

    it('should log everything at DEBUG level', () => {
      setLogLevel(LogLevel.DEBUG);
      
      debug('test', 'debug message');
      info('test', 'info message');
      warn('test', 'warn message');
      error('test', 'error message');
      
      expect(console.debug).toHaveBeenCalledOnce();
      expect(console.log).toHaveBeenCalledOnce();
      expect(console.warn).toHaveBeenCalledOnce();
      expect(console.error).toHaveBeenCalledOnce();
    });
  });

  describe('context', () => {
    it('should include runId and agentProfile in logs', () => {
      setRunContext('test_run_123', 'buyer-1');
      
      info('test', 'message');
      
      const call = (console.log as any).mock.calls[0][0];
      expect(call).toContain('[test_run_123]');
      expect(call).toContain('<buyer-1>');
    });

    it('should handle missing context gracefully', () => {
      setRunContext();
      
      info('test', 'message');
      
      const call = (console.log as any).mock.calls[0][0];
      expect(call).not.toContain('[undefined]');
      expect(call).not.toContain('<undefined>');
    });
  });

  describe('data attachment', () => {
    it('should include additional data when provided', () => {
      const originalEnv = process.env.LOG_FORMAT;
      process.env.LOG_FORMAT = 'json';
      
      info('test', 'message', { key: 'value', count: 42 });
      
      const call = (console.log as any).mock.calls[0][0];
      const parsed = JSON.parse(call);
      
      expect(parsed.data).toEqual({ key: 'value', count: 42 });
      
      process.env.LOG_FORMAT = originalEnv;
    });
  });

  describe('output formats', () => {
    it('should output JSON when LOG_FORMAT=json', () => {
      const originalEnv = process.env.LOG_FORMAT;
      process.env.LOG_FORMAT = 'json';
      
      info('test', 'message');
      
      const call = (console.log as any).mock.calls[0][0];
      expect(() => JSON.parse(call)).not.toThrow();
      
      const parsed = JSON.parse(call);
      expect(parsed.level).toBe('INFO');
      expect(parsed.component).toBe('test');
      expect(parsed.message).toBe('message');
      
      process.env.LOG_FORMAT = originalEnv;
    });

    it('should output human-readable by default', () => {
      info('test', 'message');
      
      const call = (console.log as any).mock.calls[0][0];
      expect(call).toContain('[test]');
      expect(call).toContain('message');
      expect(call).toContain('INFO');
    });
  });
});
