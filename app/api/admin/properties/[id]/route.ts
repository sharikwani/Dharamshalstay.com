import { NextRequest, NextResponse } from 'next/server';
import { refreshPublishedProperties } from '@/lib/property-cache';

export const fetchCache = 'force-no-store';

/**
 * DELETE /api/admin/properties/[id]
 * Permanently deletes a property. Uses service role key to bypass RLS.
 * References in other tables are cleared by the database's ON DELETE rules, in the same statement.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !serviceKey || !anonKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    // Auth check: verify caller is admin
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized - missing auth header' }, { status: 401 });
    }

    const { createClient } = await import('@supabase/supabase-js');

    // Verify user via their token
    const sbAuth = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await sbAuth.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized - invalid session' }, { status: 401 });
    }

    // Service role client (bypasses RLS)
    const sbAdmin = createClient(url, serviceKey);

    // Check that the caller is an admin
    const { data: profile, error: profileErr } = await sbAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileErr || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - admin only' }, { status: 403 });
    }

    const propertyId = params.id;
    if (!propertyId) {
      return NextResponse.json({ error: 'Missing property ID' }, { status: 400 });
    }

    // Check property exists
    const { data: existing } = await sbAdmin
      .from('properties')
      .select('id, name')
      .eq('id', propertyId)
      .single();
    refreshPublishedProperties();

    if (!existing) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // One statement: the database clears every reference to the property itself (bookings, inquiries, commission
    // records, notification log and testimonials are ON DELETE SET NULL since v5 / v25; rooms, images and offers
    // cascade), so the delete either happens completely or not at all.
    const { error: deleteErr } = await sbAdmin
      .from('properties')
      .delete()
      .eq('id', propertyId);
    refreshPublishedProperties();

    if (deleteErr) {
      console.error('Property delete error:', deleteErr);
      if (deleteErr.code === '23503') {
        return NextResponse.json({
          error: 'This property is still linked to other records, so nothing was deleted. Apply database migration v25, then try again.',
        }, { status: 409 });
      }
      return NextResponse.json({ error: 'Delete failed: ' + deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: existing.name });
  } catch (err: any) {
    console.error('Delete API error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
