-- Alter public.profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dodo_customer_id TEXT;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  dodo_customer_id TEXT,
  dodo_subscription_id TEXT UNIQUE NOT NULL,
  plan_name TEXT NOT NULL,
  billing_cycle TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Alter public.payments table to add new columns
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS amount NUMERIC;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS transaction_reference TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS dodo_payment_id TEXT UNIQUE;

-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  dodo_invoice_id TEXT UNIQUE NOT NULL,
  amount NUMERIC,
  currency TEXT,
  status TEXT NOT NULL,
  invoice_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create webhook_events table
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false NOT NULL,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow users to read their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Allow users to read their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Allow users to read their own payments" ON public.payments;

-- Create RLS Policies
CREATE POLICY "Allow users to read their own subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow users to read their own invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow users to read their own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR customer_email = auth.jwt()->>'email');

-- Create triggers to update updated_at for subscriptions and invoices
CREATE OR REPLACE TRIGGER on_subscriptions_updated
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

CREATE OR REPLACE TRIGGER on_invoices_updated
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();
