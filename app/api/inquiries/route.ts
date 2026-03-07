import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

function getTodayIST(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return ist.toISOString().split('T')[0];
}

const schema = z.object({
  type: z.enum(['hotel', 'taxi', 'trek', 'paragliding', 'general']),
  name: z.string().min(2), email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(10), message: z.string().optional(),
  check_in: z.string().optional(), check_out: z.string().optional(), guests: z.number().optional(),
  property_id: z.string().optional(), trek_id: z.string().optional(),
  paragliding_id: z.string().optional(),
  pickup_location: z.string().optional(), drop_location: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

    const data = parsed.data;
    const today = getTodayIST();
    if (data.check_in && data.check_in < today) {
      return NextResponse.json({ error: 'Check-in date cannot be in the past' }, { status: 400 });
    }
    if (data.check_in && data.check_out && data.check_out <= data.check_in) {
      return NextResponse.json({ error: 'Check-out must be after check-in' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(url, key);
      await sb.from('inquiries').insert({
        ...data,
        status: 'new',
        created_at: new Date().toISOString(),
      });
    } else {
      console.log('📩 Inquiry:', JSON.stringify(data, null, 2));
    }
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}

