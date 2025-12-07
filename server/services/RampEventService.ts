/**
 * RampEventService - Emits cattle ramp events to TuringCore Protocol
 * 
 * This service sends structured events to TuringCore for blockchain anchoring
 * and audit trail creation. Each event includes the PIC code as an opaque
 * reference to enable property-level traceability without exposing PII.
 */

import axios from 'axios';

// TuringCore API configuration
const TURING_CORE_URL = process.env.TURING_CORE_URL || 'http://localhost:4000';
const TURING_CORE_API_KEY = process.env.TURING_CORE_API_KEY || '';

export interface RampEvent {
  eventType: 'RUN_CREATED' | 'RUN_CONFIRMED' | 'NLIS_EXPORT_GENERATED' | 'ANIMAL_DETECTED';
  runId: string;
  siteId: string;
  picCode: string; // Property Identification Code (8 chars)
  runType: 'INCOMING' | 'OUTGOING';
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface TuringCoreEventPayload {
  eventType: string;
  entityId: string;
  location: {
    siteId: string;
    picCode: string; // Opaque reference to property
  };
  metadata: Record<string, any>;
  timestamp: string;
}

/**
 * Emit a ramp event to TuringCore Protocol
 * 
 * @param event - The ramp event to emit
 * @returns Promise<void>
 */
export async function emitRampEvent(event: RampEvent): Promise<void> {
  try {
    const payload: TuringCoreEventPayload = {
      eventType: `icattle.ramp.${event.eventType.toLowerCase()}`,
      entityId: event.runId,
      location: {
        siteId: event.siteId,
        picCode: event.picCode, // PIC code sent as opaque reference
      },
      metadata: {
        runType: event.runType,
        ...event.metadata,
      },
      timestamp: event.timestamp,
    };

    console.log('[RampEventService] Emitting event to TuringCore:', {
      eventType: payload.eventType,
      entityId: payload.entityId,
      picCode: event.picCode,
    });

    // Send event to TuringCore Protocol
    const response = await axios.post(
      `${TURING_CORE_URL}/api/events`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TURING_CORE_API_KEY}`,
        },
        timeout: 5000, // 5 second timeout
      }
    );

    console.log('[RampEventService] Event emitted successfully:', response.data);
  } catch (error: any) {
    // Log error but don't fail the operation
    // Events are best-effort for audit trail
    console.error('[RampEventService] Failed to emit event to TuringCore:', {
      error: error.message,
      eventType: event.eventType,
      runId: event.runId,
      picCode: event.picCode,
    });

    // In production, you might want to queue failed events for retry
    // For now, we log and continue
  }
}

/**
 * Emit a RUN_CREATED event
 */
export async function emitRunCreated(params: {
  runId: string;
  siteId: string;
  picCode: string;
  runType: 'INCOMING' | 'OUTGOING';
  metadata?: Record<string, any>;
}): Promise<void> {
  await emitRampEvent({
    eventType: 'RUN_CREATED',
    runId: params.runId,
    siteId: params.siteId,
    picCode: params.picCode,
    runType: params.runType,
    timestamp: new Date().toISOString(),
    metadata: params.metadata,
  });
}

/**
 * Emit a RUN_CONFIRMED event
 */
export async function emitRunConfirmed(params: {
  runId: string;
  siteId: string;
  picCode: string;
  runType: 'INCOMING' | 'OUTGOING';
  animalCount: number;
  metadata?: Record<string, any>;
}): Promise<void> {
  await emitRampEvent({
    eventType: 'RUN_CONFIRMED',
    runId: params.runId,
    siteId: params.siteId,
    picCode: params.picCode,
    runType: params.runType,
    timestamp: new Date().toISOString(),
    metadata: {
      animalCount: params.animalCount,
      ...params.metadata,
    },
  });
}

/**
 * Emit an NLIS_EXPORT_GENERATED event
 */
export async function emitNlisExportGenerated(params: {
  runId: string;
  siteId: string;
  picCode: string;
  runType: 'INCOMING' | 'OUTGOING';
  exportId: string;
  fileName: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  await emitRampEvent({
    eventType: 'NLIS_EXPORT_GENERATED',
    runId: params.runId,
    siteId: params.siteId,
    picCode: params.picCode,
    runType: params.runType,
    timestamp: new Date().toISOString(),
    metadata: {
      exportId: params.exportId,
      fileName: params.fileName,
      ...params.metadata,
    },
  });
}

/**
 * Emit an ANIMAL_DETECTED event (for individual animal detections)
 */
export async function emitAnimalDetected(params: {
  runId: string;
  siteId: string;
  picCode: string;
  runType: 'INCOMING' | 'OUTGOING';
  animalId: string;
  nlisId?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  await emitRampEvent({
    eventType: 'ANIMAL_DETECTED',
    runId: params.runId,
    siteId: params.siteId,
    picCode: params.picCode,
    runType: params.runType,
    timestamp: new Date().toISOString(),
    metadata: {
      animalId: params.animalId,
      nlisId: params.nlisId,
      ...params.metadata,
    },
  });
}
