# TuringCore Protocol Integration

## Overview

The iCattle Ramp AI application integrates with **TuringCore Protocol** to emit structured events for blockchain anchoring and audit trail creation. Each event includes the **PIC code** (Property Identification Code) as an opaque reference to enable property-level traceability without exposing personally identifiable information (PII).

## Architecture

### Event Flow

```
iCattle Ramp AI → RampEventService → TuringCore API → RedBelly Blockchain
```

1. **iCattle Ramp AI**: Cattle ramp operations (run creation, confirmation, NLIS export)
2. **RampEventService**: Formats and emits events with PIC codes
3. **TuringCore API**: Receives events and processes them through the Protocol
4. **RedBelly Blockchain**: Anchors cryptographic hashes for immutable audit trail

### Event Types

The system emits four types of events:

| Event Type | Trigger | Includes PIC Code | Purpose |
|------------|---------|-------------------|---------|
| `RUN_CREATED` | New run created | ✅ | Track run initiation at specific property |
| `RUN_CONFIRMED` | Run confirmed by operator | ✅ | Record final animal count and location |
| `NLIS_EXPORT_GENERATED` | NLIS export file created | ✅ | Link export to property for compliance |
| `ANIMAL_DETECTED` | Individual animal detected | ✅ | Per-animal traceability (future use) |

## Implementation

### RampEventService

Located at: `server/services/RampEventService.ts`

The service provides four main functions:

```typescript
// Emit run creation event
await emitRunCreated({
  runId: string,
  siteId: string,
  picCode: string,      // 8-character PIC code
  runType: 'INCOMING' | 'OUTGOING',
  metadata?: Record<string, any>
});

// Emit run confirmation event
await emitRunConfirmed({
  runId: string,
  siteId: string,
  picCode: string,
  runType: 'INCOMING' | 'OUTGOING',
  animalCount: number,
  metadata?: Record<string, any>
});

// Emit NLIS export event
await emitNlisExportGenerated({
  runId: string,
  siteId: string,
  picCode: string,
  runType: 'INCOMING' | 'OUTGOING',
  exportId: string,
  fileName: string,
  metadata?: Record<string, any>
});
```

### Event Payload Structure

Events are sent to TuringCore with the following structure:

```json
{
  "eventType": "icattle.ramp.run_created",
  "entityId": "RUN-1234567890",
  "location": {
    "siteId": "SITE-001",
    "picCode": "NTPB0001"
  },
  "metadata": {
    "runType": "INCOMING",
    "truckId": "TRUCK-123",
    "lotNumber": "LOT-456",
    "counterpartyName": "Example Farm"
  },
  "timestamp": "2024-12-07T19:30:00.000Z"
}
```

### Integration Points

Events are emitted at three key points in the run lifecycle:

#### 1. Run Creation (`createRun` mutation)

```typescript
// After database insert
await emitRunCreated({
  runId,
  siteId: input.siteId,
  picCode: input.picCode,
  runType: input.runType,
  metadata: {
    truckId: input.truckId,
    lotNumber: input.lotNumber,
    counterpartyName: input.counterpartyName,
  },
});
```

#### 2. Run Confirmation (`confirmRun` mutation)

```typescript
// After status update, before NLIS export
await emitRunConfirmed({
  runId: input.runId,
  siteId: run.site_id,
  picCode: run.pic_code,
  runType: run.run_type,
  animalCount,
  metadata: {
    truckId: run.truck_id,
    lotNumber: run.lot_number,
  },
});
```

#### 3. NLIS Export Generation (`confirmRun` mutation)

```typescript
// After NLIS export created
await emitNlisExportGenerated({
  runId: input.runId,
  siteId: run.site_id,
  picCode: run.pic_code,
  runType: run.run_type,
  exportId,
  fileName: `nlis-${input.runId}.csv`,
  metadata: {
    animalCount,
  },
});
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TURING_CORE_URL` | No | `http://localhost:4000` | TuringCore API endpoint |
| `TURING_CORE_API_KEY` | Yes | - | API key for authentication |

### Example Configuration

```bash
# .env
TURING_CORE_URL=https://turingcore.example.com
TURING_CORE_API_KEY=your-api-key-here
```

## Error Handling

The RampEventService is designed to **fail gracefully**:

- ✅ Events are **best-effort** - failures don't block operations
- ✅ Errors are **logged** with full context for debugging
- ✅ Network timeouts are set to **5 seconds** to prevent hanging
- ✅ Failed events are **logged** but don't throw exceptions

### Example Error Log

```
[RampEventService] Failed to emit event to TuringCore: {
  error: 'connect ECONNREFUSED 127.0.0.1:4000',
  eventType: 'RUN_CREATED',
  runId: 'RUN-1234567890',
  picCode: 'NTPB0001'
}
```

## PIC Code Privacy

The PIC code is treated as an **opaque reference** in TuringCore:

- ✅ TuringCore **does not** resolve PIC codes to property names
- ✅ TuringCore **does not** store property owner information
- ✅ PIC registry remains **isolated** in iCattle Ramp AI
- ✅ Only the 8-character code is transmitted

This design ensures:
- **Privacy**: Property owner details stay in the ramp application
- **Traceability**: Events can be linked to properties via PIC code
- **Compliance**: Blockchain audit trail without exposing PII

## Testing

### Manual Testing

Run the test script to verify event emission:

```bash
cd /home/ubuntu/icattle-ramp-ai
npx tsx test-event-emission.ts
```

Expected output:
```
🧪 Testing TuringCore Event Emission

Test 1: Emitting RUN_CREATED event...
[RampEventService] Emitting event to TuringCore: {
  eventType: 'icattle.ramp.run_created',
  entityId: 'TEST-RUN-001',
  picCode: 'NTPB0001'
}
✅ RUN_CREATED event emitted successfully
...
```

### Integration Testing

To test with a live TuringCore instance:

1. Start TuringCore locally or point to staging environment
2. Set environment variables:
   ```bash
   export TURING_CORE_URL=http://localhost:4000
   export TURING_CORE_API_KEY=test-key
   ```
3. Create a test run through the UI
4. Check TuringCore logs for received events

## Future Enhancements

### Planned Features

1. **Event Retry Queue**: Queue failed events for retry with exponential backoff
2. **Per-Animal Events**: Emit `ANIMAL_DETECTED` events for individual animals
3. **Batch Events**: Emit multiple animal detections in a single request
4. **Event Acknowledgment**: Wait for TuringCore confirmation before proceeding
5. **Blockchain Proof Display**: Show RedBelly transaction hashes in UI

### Event Retry Implementation (Future)

```typescript
// Pseudocode for future retry mechanism
interface FailedEvent {
  event: RampEvent;
  attempts: number;
  lastAttempt: Date;
  nextRetry: Date;
}

const failedEventQueue: FailedEvent[] = [];

async function retryFailedEvents() {
  const now = new Date();
  const eventsToRetry = failedEventQueue.filter(e => e.nextRetry <= now);
  
  for (const failedEvent of eventsToRetry) {
    try {
      await emitRampEvent(failedEvent.event);
      // Remove from queue on success
    } catch (error) {
      // Exponential backoff: 1min, 5min, 15min, 1hr
      failedEvent.attempts++;
      failedEvent.nextRetry = calculateNextRetry(failedEvent.attempts);
    }
  }
}
```

## Troubleshooting

### Events Not Reaching TuringCore

**Symptom**: Logs show "Failed to emit event to TuringCore"

**Possible Causes**:
1. TuringCore is not running
2. Wrong `TURING_CORE_URL` configuration
3. Network connectivity issues
4. Invalid API key

**Solution**:
```bash
# Check TuringCore is running
curl http://localhost:4000/health

# Verify environment variables
echo $TURING_CORE_URL
echo $TURING_CORE_API_KEY

# Check network connectivity
ping turingcore.example.com
```

### Missing PIC Codes in Events

**Symptom**: Events sent but `picCode` is null or undefined

**Possible Causes**:
1. Run created before PIC integration
2. Database migration not applied
3. PIC validation bypassed

**Solution**:
```sql
-- Check runs have PIC codes
SELECT run_id, pic_code FROM icattle_runs WHERE pic_code IS NULL;

-- Verify migration applied
SELECT * FROM icattle_runs LIMIT 1;
-- Should have pic_code column
```

## References

- [TuringCore-v3 Repository](https://github.com/TuringDynamics3000/TuringCore-v3)
- [RedBelly Blockchain Documentation](https://redbelly.network/)
- [NT PIC Registry](https://nt.gov.au/industry/agriculture/livestock/property-identification-codes)

## Support

For issues or questions:
- **iCattle Ramp AI**: Check application logs in `/tmp/ramp-server.log`
- **TuringCore Protocol**: See TuringCore-v3 repository documentation
- **PIC Registry**: Refer to `docs/PIC_INTEGRATION.md`
