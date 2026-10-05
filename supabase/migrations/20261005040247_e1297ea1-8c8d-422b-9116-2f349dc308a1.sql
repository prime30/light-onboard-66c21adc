CREATE TABLE public.multipass_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip text,
  outcome text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.multipass_attempts TO service_role;
ALTER TABLE public.multipass_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX multipass_attempts_email_time ON public.multipass_attempts (email, created_at DESC);
CREATE INDEX multipass_attempts_ip_time ON public.multipass_attempts (ip, created_at DESC);