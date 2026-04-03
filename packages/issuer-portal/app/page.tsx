import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '../lib/supabase/server';

export default async function RootPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  // Check role — admins go to /admin, users go to /dashboard
  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (profile?.role === 'admin') {
    redirect('/admin');
  } else {
    redirect('/dashboard');
  }
}
