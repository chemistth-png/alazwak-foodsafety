-- Close legacy cross-user Telegram access reported by security scanners.
-- Telegram integration is server-managed; authenticated browser clients do not need
-- direct access to subscriber identities, message history, or bot settings.

DO $$
BEGIN
  IF to_regclass('public.telegram_users') IS NOT NULL THEN
    ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow authenticated users to view telegram users" ON public.telegram_users;
    REVOKE ALL ON public.telegram_users FROM anon, authenticated;
  END IF;

  IF to_regclass('public.telegram_messages') IS NOT NULL THEN
    ALTER TABLE public.telegram_messages ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow authenticated users to view telegram messages" ON public.telegram_messages;
    REVOKE ALL ON public.telegram_messages FROM anon, authenticated;
  END IF;

  IF to_regclass('public.telegram_settings') IS NOT NULL THEN
    ALTER TABLE public.telegram_settings ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow authenticated users to manage telegram settings" ON public.telegram_settings;
    REVOKE ALL ON public.telegram_settings FROM anon, authenticated;
  END IF;
END
$$;
