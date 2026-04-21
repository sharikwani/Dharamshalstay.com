'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building, ArrowLeft, Eye, Pencil, ToggleLeft, ToggleRight, Trash2, Loader2, Mail, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrice, statusLabel, STATUS_COLORS, cn } from '@/lib/utils';

const FILTERS = ['published', 'pending_review', 'changes_requested', 'suspended', 'rejected', 'draft', 'all'] as const;

export default function AdminProperties() {
  const router = useRouter();
  const [allProperties, setAllProperties] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('published');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignEmail, setAssignEmail] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/admin/login'); return; }
    const { data } = await supabase.from('properties').select('*').order('updated_at', { ascending: false });
    const all = data || [];
    setAllProperties(all);
    setProperties(filter === 'all' ? all : all.filter(p => p.status === filter));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    setProperties(filter === 'all' ? allProperties : allProperties.filter(p => p.status === filter));
  }, [filter, allProperties]);

  function getCount(f: string): number {
    return f === 'all' ? allProperties.length : allProperties.filter(p => p.status === f).length;
  }

  async function toggleFeatured(id: string, current: boolean) {
    const { error } = await supabase.from('properties').update({ featured: !current }).eq('id', id);
    if (error) alert('Failed: ' + error.message);
    load();
  }

  async function changeStatus(id: string, newStatus: string) {
    const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'published') updates.published_at = new Date().toISOString();
    const { error } = await supabase.from('properties').update(updates).eq('id', id);
    if (error) alert('Failed: ' + error.message);
    load();
  }

  async function deleteProperty(id: string, name: string) {
    if (!confirm('Permanently delete "' + name + '"? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { alert('Session expired'); return; }
      const res = await fetch('/api/admin/properties/' + id, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + session.access_token },
      });
      const result = await res.json();
      if (!res.ok) { alert('Delete failed: ' + (result.error || 'Unknown error')); return; }
      setAllProperties(prev => prev.filter(p => p.id !== id));
    } catch (err: any) { alert('Delete failed: ' + err.message); }
    finally { setDeletingId(null); }
  }

  async function handleAssignEmail(id: string) {
    if (!assignEmail.trim()) { alert('Enter an email address'); return; }
    setAssignLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { alert('Session expired'); return; }
      const res = await fetch('/api/admin/properties/' + id + '/assign', {
        method: 'PATCH',
        headers: { 'Authorization': 'Bearer ' + session.access_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_email: assignEmail.trim() }),
      });
      const result = await res.json();
      if (!res.ok) { alert('Failed: ' + (result.error || 'Unknown error')); return; }
      // Update local state
      setAllProperties(prev => prev.map(p => p.id === id ? { ...p, owner_email: assignEmail.trim().toLowerCase() } : p));
      setAssigningId(null);
      setAssignEmail('');
    } catch (err: any) { alert('Failed: ' + err.message); }
    finally { setAssignLoading(false); }
  }

  function startAssign(id: string, currentEmail: string) {
    setAssigningId(id);
    setAssignEmail(currentEmail || '');
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/admin/dashboard" className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 mb-4">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>
      <h1 className="text-2xl font-heading font-bold text-slate-900 mb-6 flex items-center gap-2">
        <Building className="h-6 w-6 text-brand-500" /> All Properties
      </h1>

      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors',
              filter === f ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
            {f === 'all' ? 'All' : statusLabel(f)}
            <span className={cn('text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center',
              filter === f ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600')}>{getCount(f)}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>
      ) : properties.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Building className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No properties with status &quot;{statusLabel(filter)}&quot;.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b text-left">
                  <th className="px-4 py-3 font-semibold text-slate-700">Property</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Type</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Area</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Price</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Owner Email</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Featured</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {properties.map(p => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 truncate max-w-[200px]">{p.name || 'Untitled'}</p>
                      <p className="text-xs text-slate-500">{p.city}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{p.type}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{p.destination_slug?.replace(/-/g, ' ')}</td>
                    <td className="px-4 py-3 text-slate-900 font-medium">{p.price_min ? formatPrice(p.price_min) : '--'}</td>
                    <td className="px-4 py-3">
                      {assigningId === p.id ? (
                        <div className="flex items-center gap-1">
                          <input value={assignEmail} onChange={e => setAssignEmail(e.target.value)}
                            placeholder="owner@email.com" autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') handleAssignEmail(p.id); if (e.key === 'Escape') { setAssigningId(null); setAssignEmail(''); } }}
                            className="w-36 px-2 py-1 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-brand-500" />
                          <button onClick={() => handleAssignEmail(p.id)} disabled={assignLoading}
                            className="p-1 text-green-600 hover:bg-green-50 rounded">
                            {assignLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          </button>
                          <button onClick={() => { setAssigningId(null); setAssignEmail(''); }}
                            className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startAssign(p.id, p.owner_email || '')}
                          className="text-xs flex items-center gap-1 text-slate-500 hover:text-brand-600 group">
                          <Mail className="h-3 w-3" />
                          {p.owner_email ? (
                            <span className="text-brand-600 truncate max-w-[120px]">{p.owner_email}</span>
                          ) : (
                            <span className="text-slate-400 group-hover:text-brand-600">Assign</span>
                          )}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[p.status] || 'bg-slate-100 text-slate-600')}>
                        {statusLabel(p.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleFeatured(p.id, p.featured)} className="text-slate-400 hover:text-amber-500">
                        {p.featured ? <ToggleRight className="h-5 w-5 text-amber-500" /> : <ToggleLeft className="h-5 w-5" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={'/admin/properties/' + p.id + '/edit'} title="Edit"
                          className="text-brand-600 hover:text-brand-700 p-1 rounded hover:bg-blue-50">
                          <Pencil className="h-4 w-4" />
                        </Link>
                        {p.status === 'published' && p.slug && (
                          <Link href={'/hotels/' + p.slug} target="_blank" title="View Live"
                            className="text-green-600 hover:text-green-700 p-1 rounded hover:bg-green-50">
                            <Eye className="h-4 w-4" />
                          </Link>
                        )}
                        {p.status === 'pending_review' && (
                          <button onClick={() => changeStatus(p.id, 'published')}
                            className="text-xs text-green-600 font-medium px-2 py-1 rounded hover:bg-green-50">Publish</button>
                        )}
                        {p.status === 'published' && (
                          <button onClick={() => changeStatus(p.id, 'suspended')}
                            className="text-xs text-red-500 font-medium px-2 py-1 rounded hover:bg-red-50">Suspend</button>
                        )}
                        {p.status === 'suspended' && (
                          <button onClick={() => changeStatus(p.id, 'published')}
                            className="text-xs text-green-600 font-medium px-2 py-1 rounded hover:bg-green-50">Restore</button>
                        )}
                        <button onClick={() => deleteProperty(p.id, p.name || 'Untitled')} disabled={deletingId === p.id} title="Delete"
                          className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 disabled:opacity-50">
                          {deletingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
