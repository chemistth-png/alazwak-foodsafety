
-- Create telegram_users table to store bot subscribers
CREATE TABLE IF NOT EXISTS public.telegram_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint UNIQUE NOT NULL,
  username text,
  first_name text,
  last_name text,
  language_code text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create telegram_messages table to store bot interactions
CREATE TABLE IF NOT EXISTS public.telegram_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id uuid REFERENCES public.telegram_users(id) ON DELETE CASCADE,
  message_id bigint NOT NULL,
  content text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'bot')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create telegram_settings table for bot configuration
CREATE TABLE IF NOT EXISTS public.telegram_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_settings ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow authenticated users to view telegram users') THEN
        CREATE POLICY "Allow authenticated users to view telegram users" ON public.telegram_users
          FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow authenticated users to view telegram messages') THEN
        CREATE POLICY "Allow authenticated users to view telegram messages" ON public.telegram_messages
          FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow authenticated users to manage telegram settings') THEN
        CREATE POLICY "Allow authenticated users to manage telegram settings" ON public.telegram_settings
          FOR ALL TO authenticated USING (true);
    END IF;
END $$;

-- Insert default settings if they don't exist
INSERT INTO public.telegram_settings (key, value) 
VALUES 
('bot_status', '{"enabled": true}'),
('welcome_message', '{"ar": "مرحباً بك في بوت الأذواق لسلامة الغذاء. كيف يمكنني مساعدتك اليوم؟", "en": "Welcome to Alazwak Food Safety Bot. How can I help you today?"}')
ON CONFLICT (key) DO NOTHING;
