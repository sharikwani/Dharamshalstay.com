import { NextRequest, NextResponse } from 'next/server';

/**
 * DELETE /api/admin/properties/[id]
 * Permanently deletes a property. Uses service role key to bypass RLS.
 * Handles foreign key references by nulling them in related tables first.
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

    if (!existing) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Step 1: Null out foreign key references in related tables (preserve history)
    // We null instead of delete to keep booking/inquiry records for reporting.
    const cleanupErrors: string[] = [];

    const { error: bookingsErr } = await sbAdmin
      .from('bookings')
      .update({ property_id: null })
      .eq('property_id', propertyId);
    if (bookingsErr) cleanupErrors.push('bookings: ' + bookingsErr.message);

    const { error: inquiriesErr } = await sbAdmin
      .from('inquiries')
      .update({ property_id: null })
      .eq('property_id', propertyId);
    if (inquiriesErr && !inquiriesErr.message.includes('does not exist')) {
      cleanupErrors.push('inquiries: ' + inquiriesErr.message);
    }

    // Try to null commission records if the table exists
    const { error: commErr } = await sbAdmin
      .from('commission_records')
      .update({ property_id: null })
      .eq('property_id', propertyId);
    if (commErr && !commErr.message.includes('does not exist')) {
      cleanupErrors.push('commission_records: ' + commErr.message);
    }

    // Try to null notification_log references
    const { error: notifErr } = await sbAdmin
      .from('notification_log')
      .update({ property_id: null })
      .eq('property_id', propertyId);
    if (notifErr && !notifErr.message.includes('does not exist')) {
      cleanupErrors.push('notification_log: ' + notifErr.message);
    }

    // Step 2: Delete the property itself
    const { error: deleteErr } = await sbAdmin
      .from('properties')
      .delete()
      .eq('id', propertyId);

    if (deleteErr) {
      console.error('Property delete error:', deleteErr);
      return NextResponse.json({
        error: 'Delete failed: ' + deleteErr.message,
        cleanup_errors: cleanupErrors,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted: existing.name,
      cleanup_errors: cleanupErrors.length ? cleanupErrors : undefined,
    });
  } catch (err: any) {
    console.error('Delete API error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
