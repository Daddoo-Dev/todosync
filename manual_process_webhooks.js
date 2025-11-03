// Manual webhook reprocessor - run this to process the failed webhook events

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://iqlukuethicuhlfugyth.supabase.co';
// Get this from your .env file or Supabase dashboard
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

async function reprocessWebhooks() {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('ERROR: Set SUPABASE_SERVICE_KEY environment variable');
    console.error('Get it from: Supabase Dashboard → Settings → API → service_role key');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  // Get unprocessed webhooks
  const { data: events, error } = await supabase
    .from('stripe_webhook_events')
    .select('*')
    .eq('processed', false)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching events:', error);
    return;
  }
  
  console.log(`Found ${events.length} unprocessed webhook events\n`);
  
  for (const event of events) {
    console.log(`Processing: ${event.event_type} (${event.stripe_event_id})`);
    
    if (event.event_type === 'checkout.session.completed') {
      const session = event.data;
      const machineId = session.client_reference_id || session.metadata?.vs_code_machine_id;
      const customerId = session.customer;
      const subscriptionId = session.subscription;
      
      if (!machineId) {
        console.log(`  ✗ No machine ID found, skipping`);
        continue;
      }
      
      console.log(`  Machine ID: ${machineId}`);
      console.log(`  Customer: ${customerId}`);
      console.log(`  Subscription: ${subscriptionId}`);
      
      // Upsert license
      const { error: upsertError } = await supabase
        .from('licenses')
        .upsert({
          vs_code_machine_id: machineId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          license_tier: 'pro',
          is_active: true,
          expires_at: null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'vs_code_machine_id'
        });
      
      if (upsertError) {
        console.log(`  ✗ Failed to update license: ${upsertError.message}`);
      } else {
        console.log(`  ✓ License upgraded to PRO`);
        
        // Mark as processed
        await supabase
          .from('stripe_webhook_events')
          .update({ processed: true })
          .eq('id', event.id);
      }
    } else {
      console.log(`  Skipping event type: ${event.event_type}`);
    }
    
    console.log('');
  }
  
  console.log('Done!');
}

reprocessWebhooks();

