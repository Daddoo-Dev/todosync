"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Stripe Webhook Handler for ToDoSync
require("jsr:@supabase/functions-js/edge-runtime.d.ts");
const supabase_js_2_1 = require("jsr:@supabase/supabase-js@2");
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }
    try {
        // Get Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabase = (0, supabase_js_2_1.createClient)(supabaseUrl, supabaseServiceKey);
        // Get Stripe webhook secret from env
        const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
        const stripeSignature = req.headers.get('stripe-signature');
        // Verify webhook signature (in production)
        if (stripeWebhookSecret && stripeSignature) {
            // TODO: Verify signature using stripe library
            // For now, we'll process without verification in development
        }
        // Parse event
        const event = await req.json();
        console.log(`Received Stripe event: ${event.type}`);
        // Store webhook event for audit
        await supabase
            .from('stripe_webhook_events')
            .insert({
            stripe_event_id: event.id,
            event_type: event.type,
            customer_id: event.data.object?.customer,
            data: event.data.object,
            processed: false
        });
        // Handle different event types
        let licenseUpdated = false;
        switch (event.type) {
            case 'checkout.session.completed':
                licenseUpdated = await handleCheckoutSessionCompleted(event, supabase);
                break;
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                licenseUpdated = await handleSubscriptionChange(event, supabase);
                break;
            case 'customer.subscription.deleted':
                licenseUpdated = await handleSubscriptionDeleted(event, supabase);
                break;
            case 'invoice.payment_succeeded':
                licenseUpdated = await handlePaymentSucceeded(event, supabase);
                break;
            case 'invoice.payment_failed':
                licenseUpdated = await handlePaymentFailed(event, supabase);
                break;
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
        // Mark as processed if we handled it
        if (licenseUpdated) {
            await supabase
                .from('stripe_webhook_events')
                .update({ processed: true })
                .eq('stripe_event_id', event.id);
        }
        return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    catch (error) {
        console.error('Webhook error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});
// Handle successful checkout
async function handleCheckoutSessionCompleted(event, supabase) {
    const session = event.data.object;
    const customerId = session.customer;
    const subscriptionId = session.subscription;
    // Extract metadata (we'll need to pass vs_code_machine_id in metadata)
    const metadata = session.metadata || {};
    const machineId = metadata.vs_code_machine_id;
    if (!machineId) {
        console.error('No machine_id in metadata');
        return false;
    }
    // Find or create license
    const { data: existing } = await supabase
        .from('licenses')
        .select('*')
        .eq('vs_code_machine_id', machineId)
        .single();
    const licenseData = {
        vs_code_machine_id: machineId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        license_tier: 'pro',
        is_active: true,
        expires_at: null, // Subscriptions don't expire, they renew
        updated_at: new Date().toISOString()
    };
    if (existing) {
        await supabase
            .from('licenses')
            .update(licenseData)
            .eq('vs_code_machine_id', machineId);
    }
    else {
        await supabase.from('licenses').insert(licenseData);
    }
    console.log(`Upgraded license for machine ${machineId} to pro`);
    return true;
}
// Handle subscription changes
async function handleSubscriptionChange(event, supabase) {
    const subscription = event.data.object;
    const customerId = subscription.customer;
    const subscriptionId = subscription.id;
    const status = subscription.status;
    // Find license by customer ID
    const { data: license } = await supabase
        .from('licenses')
        .select('*')
        .eq('stripe_customer_id', customerId)
        .single();
    if (!license) {
        console.error(`No license found for customer ${customerId}`);
        return false;
    }
    // Update based on status
    const isActive = status === 'active' || status === 'trialing';
    const licenseTier = isActive ? 'pro' : 'free';
    await supabase
        .from('licenses')
        .update({
        is_active: isActive,
        license_tier: licenseTier,
        updated_at: new Date().toISOString()
    })
        .eq('vs_code_machine_id', license.vs_code_machine_id);
    console.log(`Updated subscription for machine ${license.vs_code_machine_id} to ${licenseTier}`);
    return true;
}
// Handle subscription cancellation
async function handleSubscriptionDeleted(event, supabase) {
    const subscription = event.data.object;
    const customerId = subscription.customer;
    // Find license
    const { data: license } = await supabase
        .from('licenses')
        .select('*')
        .eq('stripe_customer_id', customerId)
        .single();
    if (!license) {
        return false;
    }
    // Downgrade to free tier
    await supabase
        .from('licenses')
        .update({
        license_tier: 'free',
        is_active: false,
        stripe_subscription_id: null,
        updated_at: new Date().toISOString()
    })
        .eq('vs_code_machine_id', license.vs_code_machine_id);
    console.log(`Downgraded license for machine ${license.vs_code_machine_id} to free`);
    return true;
}
// Handle successful payment
async function handlePaymentSucceeded(event, supabase) {
    const invoice = event.data.object;
    const customerId = invoice.customer;
    const subscriptionId = invoice.subscription;
    // Find license
    const { data: license } = await supabase
        .from('licenses')
        .select('*')
        .eq('stripe_customer_id', customerId)
        .single();
    if (!license) {
        return false;
    }
    // Ensure active
    await supabase
        .from('licenses')
        .update({
        is_active: true,
        license_tier: 'pro',
        updated_at: new Date().toISOString()
    })
        .eq('vs_code_machine_id', license.vs_code_machine_id);
    console.log(`Payment succeeded for machine ${license.vs_code_machine_id}`);
    return true;
}
// Handle failed payment
async function handlePaymentFailed(event, supabase) {
    const invoice = event.data.object;
    const customerId = invoice.customer;
    // Find license
    const { data: license } = await supabase
        .from('licenses')
        .select('*')
        .eq('stripe_customer_id', customerId)
        .single();
    if (!license) {
        return false;
    }
    // Give grace period - don't immediately downgrade
    // Just log it for now
    console.log(`Payment failed for machine ${license.vs_code_machine_id}`);
    // TODO: Implement grace period logic
    // After X failed payments, downgrade to free
    return true;
}
//# sourceMappingURL=index.js.map