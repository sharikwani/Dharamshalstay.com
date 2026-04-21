import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !serviceKey || !anonKey) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

    // Verify admin
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { createClient } = await import('@supabase/supabase-js');
    const sbAuth = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await sbAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sbAdmin = createClient(url, serviceKey);
    const { data: profile } = await sbAdmin.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const { owner_email } = body;

    // Update the property
    const updates: any = { updated_at: new Date().toISOString() };
    if (typeof owner_email === 'string') {
      updates.owner_email = owner_email.trim().toLowerCase() || null;
    }

    // Also link owner_id if a user with this email exists
    if (updates.owner_email) {
      const { data: existingUser } = await sbAdmin
        .from('profiles')
        .select('id')
        .eq('email', updates.owner_email)
        .single();
      if (existingUser) {
        updates.owner_id = existingUser.id;
      }
    }

    const { data, error } = await sbAdmin
      .from('properties')
      .update(updates)
      .eq('id', params.id)
      .select('id, name, owner_email')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, property: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
