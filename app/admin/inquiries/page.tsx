'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, ArrowLeft, Phone, Mail, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminInquiries() {
  const router = useRouter();
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  async function loadInquiries() {
    setLoading(true);
    const query = filter === 'all'
      ? supabase.from('inquiries').select('*').order('created_at', { ascending: false }).limit(50)
      : supabase.from('inquiries').select('*').eq('status', filter).order('created_at', { ascending: false }).limit(50);
    const { data } = await query;
    setInquiries(data || []);
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/admin/login');
      else loadInquiries();
    });
  }, [filter, router]);

  async function updateStatus(id: string, status: string) {
    await supabase.from('inquiries').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    loadInquiries();
  }

  const statusColors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700', contacted: 'bg-amber-100 text-amber-700',
    converted: 'bg-green-100 text-green-700', closed: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/admin/dashboard" className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 mb-4"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
      <h1 className="text-2xl font-heading font-bold text-slate-900 mb-6 flex items-center gap-2"><MessageSquare className="h-6 w-6 text-purple-500" /> Inquiries</h1>

      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
        {['all', 'new', 'contacted', 'converted', 'closed'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap ${filter === f ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? <p className="text-slate-500">Loading...</p> : inquiries.length === 0 ? <p className="text-slate-500">No inquiries found.</p> : (
        <div className="space-y-3">
          {inquiries.map(inq => (
            <div key={inq.id} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900">{inq.name}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColors[inq.status]}`}>{inq.status}</span>
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full capitalize">{inq.type}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <a href={`tel:${inq.phone}`} className="flex items-center gap-1 hover:text-brand-600"><Phone className="h-3.5 w-3.5" />{inq.phone}</a>
                    {inq.email && <a href={`mailto:${inq.email}`} className="flex items-center gap-1 hover:text-brand-600"><Mail className="h-3.5 w-3.5" />{inq.email}</a>}
                    <span className="text-xs">{new Date(inq.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {['new', 'contacted', 'converted', 'closed'].filter(s => s !== inq.status).map(s => (
                    <button key={s} onClick={() => updateStatus(inq.id, s)}
                      className={`text-xs px-2 py-1 rounded border font-medium capitalize
                        ${s === 'contacted' ? 'border-amber-300 text-amber-700 hover:bg-amber-50' :
                          s === 'converted' ? 'border-green-300 text-green-700 hover:bg-green-50' :
                          s === 'closed' ? 'border-slate-300 text-slate-600 hover:bg-slate-50' :
                          'border-blue-300 text-blue-700 hover:bg-blue-50'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {(inq.check_in || inq.check_out || inq.guests) && (
                <div className="flex gap-4 text-sm text-slate-600 mb-2">
                  {inq.check_in && <span>Check-in: <strong>{inq.check_in}</strong></span>}
                  {inq.check_out && <span>Check-out: <strong>{inq.check_out}</strong></span>}
                  {inq.guests && <span>Guests: <strong>{inq.guests}</strong></span>}
                </div>
              )}
              {(inq.pickup_location || inq.drop_location) && (
                <p className="text-sm text-slate-600 mb-2">
                  {inq.pickup_location && <span>Pickup: <strong>{inq.pickup_location}</strong></span>}
                  {inq.drop_location && <span> → Drop: <strong>{inq.drop_location}</strong></span>}
                </p>
              )}
              {inq.message && <p className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg mt-2">{inq.message}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
