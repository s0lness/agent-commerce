/**
 * Audit logging for agent decisions
 * Tracks all critical decisions with reasoning for security review
 */

import { writeFile, appendFile, mkdir } from 'fs/promises';
import { join } from 'path';

export interface AuditEntry {
  timestamp: string;
  agentProfile: string;
  runId?: string;
  eventType: 'OFFER_MADE' | 'OFFER_ACCEPTED' | 'OFFER_REJECTED' | 'CONSTRAINT_VIOLATION' | 'INJECTION_DETECTED';
  decision: string;
  reasoning?: string;
  constraints?: any;
  violations?: string[];
  suspiciousContent?: string[];
  metadata?: any;
}

let auditLogPath: string | null = null;

/**
 * Initialize audit logging for a run
 */
export function initAuditLog(runDir: string): void {
  auditLogPath = join(runDir, 'out', 'audit.jsonl');
}

/**
 * Log an agent decision to the audit trail
 */
export async function logAuditEvent(entry: AuditEntry): Promise<void> {
  if (!auditLogPath) {
    throw new Error('Audit log not initialized. Call initAuditLog() first.');
  }

  const line = JSON.stringify(entry) + '\n';
  
  try {
    await appendFile(auditLogPath, line);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      // File doesn't exist yet, create it
      await mkdir(join(auditLogPath, '..'), { recursive: true });
      await writeFile(auditLogPath, line);
    } else {
      throw err;
    }
  }
}

/**
 * Log a buyer offer decision
 */
export async function logBuyerOffer(
  agentProfile: string,
  offerPrice: number,
  accepted: boolean,
  reasoning: string,
  constraints: any,
  violations: string[] = []
): Promise<void> {
  await logAuditEvent({
    timestamp: new Date().toISOString(),
    agentProfile,
    eventType: accepted ? 'OFFER_MADE' : 'CONSTRAINT_VIOLATION',
    decision: accepted 
      ? `Offered ${offerPrice}€` 
      : `Rejected offer of ${offerPrice}€`,
    reasoning,
    constraints,
    violations: violations.length > 0 ? violations : undefined,
  });
}

/**
 * Log a seller acceptance decision
 */
export async function logSellerAcceptance(
  agentProfile: string,
  acceptedPrice: number,
  accepted: boolean,
  reasoning: string,
  constraints: any,
  violations: string[] = []
): Promise<void> {
  await logAuditEvent({
    timestamp: new Date().toISOString(),
    agentProfile,
    eventType: accepted ? 'OFFER_ACCEPTED' : 'CONSTRAINT_VIOLATION',
    decision: accepted
      ? `Accepted offer of ${acceptedPrice}€`
      : `Rejected offer of ${acceptedPrice}€`,
    reasoning,
    constraints,
    violations: violations.length > 0 ? violations : undefined,
  });
}

/**
 * Log detection of prompt injection attempt
 */
export async function logInjectionAttempt(
  agentProfile: string,
  message: string,
  injectionMarkers: string[]
): Promise<void> {
  await logAuditEvent({
    timestamp: new Date().toISOString(),
    agentProfile,
    eventType: 'INJECTION_DETECTED',
    decision: 'Message flagged as suspicious',
    suspiciousContent: injectionMarkers,
    metadata: { 
      messagePreview: message.slice(0, 100),
      markerCount: injectionMarkers.length,
    },
  });
}

/**
 * Generate audit report summary
 */
export interface AuditSummary {
  totalEvents: number;
  offersMade: number;
  offersAccepted: number;
  offersRejected: number;
  constraintViolations: number;
  injectionAttempts: number;
  violationTypes: { [key: string]: number };
}

export async function generateAuditSummary(auditLogPath: string): Promise<AuditSummary> {
  const fs = await import('fs/promises');
  const content = await fs.readFile(auditLogPath, 'utf-8');
  const lines = content.trim().split(/\r?\n/).filter(Boolean);
  
  const summary: AuditSummary = {
    totalEvents: lines.length,
    offersMade: 0,
    offersAccepted: 0,
    offersRejected: 0,
    constraintViolations: 0,
    injectionAttempts: 0,
    violationTypes: {},
  };
  
  for (const line of lines) {
    try {
      const entry: AuditEntry = JSON.parse(line);
      
      switch (entry.eventType) {
        case 'OFFER_MADE':
          summary.offersMade++;
          break;
        case 'OFFER_ACCEPTED':
          summary.offersAccepted++;
          break;
        case 'OFFER_REJECTED':
          summary.offersRejected++;
          break;
        case 'CONSTRAINT_VIOLATION':
          summary.constraintViolations++;
          if (entry.violations) {
            for (const v of entry.violations) {
              const type = v.split(':')[0];
              summary.violationTypes[type] = (summary.violationTypes[type] || 0) + 1;
            }
          }
          break;
        case 'INJECTION_DETECTED':
          summary.injectionAttempts++;
          break;
      }
    } catch {
      continue;
    }
  }
  
  return summary;
}
