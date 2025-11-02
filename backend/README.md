# ToDoSync Backend

Stripe webhook handler running on Supabase Edge Functions to process payments and manage licenses.

## Architecture

```
Stripe → Webhook → Supabase Edge Function → Supabase Database
```

## Setup

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link to your project

```bash
supabase link --project-ref iqlukuethicuhlfugyth
```

### 4. Deploy

```bash
supabase functions deploy stripe-webhook
```

### 5. Configure Stripe Webhook

In Stripe Dashboard:
- Go to Developers → Webhooks
- Add endpoint: `https://iqlukuethicuhlfugyth.supabase.co/functions/v1/stripe-webhook`
- Select events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

## Environment Variables

Set in Supabase Dashboard → Edge Functions → stripe-webhook → Settings:

- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Webhook signing secret from Stripe

## Testing

Use Stripe CLI for local testing:

```bash
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
stripe trigger checkout.session.completed
```

