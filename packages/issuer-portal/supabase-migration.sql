-- ============================================================
-- Issuer Portal — Supabase Migration
-- Run this in your Supabase project: SQL Editor → New query
-- ============================================================

-- ── 1. Profiles (extends auth.users) ────────────────────────
CREATE TABLE public.profiles (
  id      uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role    text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-create a profile row when a new user registers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 2. KYC Submissions ──────────────────────────────────────
CREATE TABLE public.kyc_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  full_name       text NOT NULL,
  nationality     text NOT NULL,
  dob             text NOT NULL,
  document_number text NOT NULL,
  subject_address text NOT NULL,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected', 'revoked')),
  rejection_reason text,
  -- Populated after admin approves (VC issuance + on-chain anchor)
  vc_jwt          text,
  credential_id   text,
  credential_hash text,
  tx_hash         text,
  issuer_did      text,
  subject_did     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Keep updated_at fresh on every UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kyc_submissions_updated_at
  BEFORE UPDATE ON public.kyc_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 3. Notifications ────────────────────────────────────────
CREATE TABLE public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  message    text NOT NULL,
  is_read    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── 4. Row Level Security ───────────────────────────────────
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications   ENABLE ROW LEVEL SECURITY;

-- profiles: each user can read their own row only
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- kyc_submissions: users can read/insert their own rows
-- (UPDATE is done server-side with the service role key — bypasses RLS)
CREATE POLICY "Users can view own submissions"
  ON public.kyc_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own submissions"
  ON public.kyc_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- notifications: users can read and mark-as-read their own rows
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own notifications read"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ── NOTE ─────────────────────────────────────────────────────
-- Admin operations (approve / reject / revoke) use the Supabase
-- service role key on the server, which bypasses RLS entirely.
-- To promote a user to admin, update their profile row directly
-- in the Supabase dashboard:
--   UPDATE public.profiles SET role = 'admin' WHERE id = '<user-uuid>';
