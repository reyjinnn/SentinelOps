const autocannon = require('autocannon');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const tenantId = 'tenant-123';
const hmacSecret = process.env.HMAC_SECRET_KEY || 'local-secret-123';

function generatePayload() {
  const payload = {
    event_id: `DSP-LOAD-${uuidv4().substring(0, 8)}`,
    tenant_id: tenantId,
    marketplace: 'SHOPEE',
    timestamp: new Date().toISOString(),
    order: {
      order_id: `ORD-LOAD-${uuidv4().substring(0, 8)}`,
      total_amount_idr: 42000,
      currency: 'IDR',
      escrow_status: 'HELD_IN_ESCROW'
    },
    customer: {
      user_id: 'USR-LOAD',
      account_age_days: 300,
      historical_return_count: 0,
      historical_order_count: 50
    },
    logistics: {
      courier_code: 'SPX_EXPRESS',
      tracking_number: 'SPXID0299182371',
      hub_inbound_weight_grams: 500,
      driver_handover_weight_grams: 500
    },
    evidence: {
      sku_reference: 'KB-MECH-RGB-01',
      customer_reason: 'Keyboard patah',
      proof_image_urls: ['https://dummy.com/img1.jpg'],
      catalog_weight_grams: 500
    }
  };

  const body = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', hmacSecret).update(body).digest('hex');

  return { body, signature };
}

const instance = autocannon({
  url: 'http://localhost:9000/api/v1/disputes/evaluate',
  connections: 100, // 100 concurrent users
  duration: 10, // seconds
  method: 'POST',
  setupClient: (client) => {
    const { body, signature } = generatePayload();
    client.setBody(body);
    client.setHeaders({
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
      'x-marketplace-source': 'SHOPEE',
      'x-signature': signature
    });
  }
}, (err, result) => {
  if (err) {
    console.error('Error running benchmark:', err);
    return;
  }
  
  console.log('\n--- Load Test Results ---');
  console.log(`Total Requests: ${result.requests.total}`);
  console.log(`Errors: ${result.errors}`);
  console.log(`Timeouts: ${result.timeouts}`);
  console.log(`Average Latency: ${result.latency.average} ms`);
  console.log(`P99 Latency: ${result.latency.p99} ms`);
  console.log(`Requests/sec: ${result.requests.average}`);
  
  if (result.latency.p99 < 50) {
    console.log('\n✅ SLA PASSED: P99 Latency is below 50ms');
  } else {
    console.log('\n❌ SLA FAILED: P99 Latency exceeds 50ms');
  }

  if (result.errors === 0) {
    console.log('✅ ERROR RATE: 0%');
  } else {
    console.log(`❌ ERROR RATE: ${(result.errors / result.requests.total * 100).toFixed(2)}%`);
  }
});

autocannon.track(instance, { renderProgressBar: true });
