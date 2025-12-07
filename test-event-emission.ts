/**
 * Test script to verify TuringCore event emission
 * 
 * This script tests the RampEventService by emitting sample events
 * and verifying they are properly formatted and sent.
 */

import { emitRunCreated, emitRunConfirmed, emitNlisExportGenerated } from './server/services/RampEventService';

async function testEventEmission() {
  console.log('🧪 Testing TuringCore Event Emission\n');

  // Test 1: RUN_CREATED event
  console.log('Test 1: Emitting RUN_CREATED event...');
  try {
    await emitRunCreated({
      runId: 'TEST-RUN-001',
      siteId: 'SITE-001',
      picCode: 'NTPB0001',
      runType: 'INCOMING',
      metadata: {
        truckId: 'TRUCK-123',
        lotNumber: 'LOT-456',
        counterpartyName: 'Test Farmer',
      },
    });
    console.log('✅ RUN_CREATED event emitted successfully\n');
  } catch (error: any) {
    console.error('❌ RUN_CREATED event failed:', error.message, '\n');
  }

  // Test 2: RUN_CONFIRMED event
  console.log('Test 2: Emitting RUN_CONFIRMED event...');
  try {
    await emitRunConfirmed({
      runId: 'TEST-RUN-001',
      siteId: 'SITE-001',
      picCode: 'NTPB0001',
      runType: 'INCOMING',
      animalCount: 25,
      metadata: {
        truckId: 'TRUCK-123',
        lotNumber: 'LOT-456',
      },
    });
    console.log('✅ RUN_CONFIRMED event emitted successfully\n');
  } catch (error: any) {
    console.error('❌ RUN_CONFIRMED event failed:', error.message, '\n');
  }

  // Test 3: NLIS_EXPORT_GENERATED event
  console.log('Test 3: Emitting NLIS_EXPORT_GENERATED event...');
  try {
    await emitNlisExportGenerated({
      runId: 'TEST-RUN-001',
      siteId: 'SITE-001',
      picCode: 'NTPB0001',
      runType: 'INCOMING',
      exportId: 'EXP-TEST-001',
      fileName: 'nlis-TEST-RUN-001.csv',
      metadata: {
        animalCount: 25,
      },
    });
    console.log('✅ NLIS_EXPORT_GENERATED event emitted successfully\n');
  } catch (error: any) {
    console.error('❌ NLIS_EXPORT_GENERATED event failed:', error.message, '\n');
  }

  console.log('🎉 Event emission tests completed!');
  console.log('\nNote: Events are sent to TuringCore at:', process.env.TURING_CORE_URL || 'http://localhost:4000');
  console.log('If TuringCore is not running, events will fail gracefully and be logged.');
}

testEventEmission();
