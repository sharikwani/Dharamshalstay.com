'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Loader2, Check, AlertCircle, Save, Send, Hotel, Sparkles, Copy, LinkIcon, X, ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { slugify, formatPrice } from '@/lib/utils';

type Step = 'input' | 'extracting' | 'review' | 'done';

// Single smart command - captures ALL visible text + ALL images + JSON-LD from any rendered page
const EXTRACT_CMD = `(function(){var t=document.body.innerText;var imgs=[...new Set([...document.querySelectorAll('img[src]')].map(function(i){return i.src}).filter(function(u){return u&&u.startsWith('http')&&u.indexOf('svg')<0&&u.indexOf('icon')<0&&u.indexOf('logo')<0&&u.indexOf('1x1')<0&&u.indexOf('pixel')<0&&u.indexOf('tracker')<0&&u.indexOf('analytics')<0}))];var ld=[];document.querySelectorAll('script[type="application/ld+json"]').forEach(function(s){try{ld.push(s.textContent)}catch(e){}});var d=JSON.stringify({text:t,images:imgs,jsonLd:ld,url:location.href,title:document.title});copy(d);alert('Done! '+imgs.length+' images captured. Now paste in the import tool.')})()`;

export default function AdminImportPage() {
  const [step, setStep] = useState<Step>('input');
  const [rawContent, setRawContent] = useState('');
  const [error, setError] = useState('');
  const [property, setProperty] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [addingTo, setAddingTo] = useState<string | null>(null);

  function handleCopy() {
    navigator.clipboard.writeText(EXTRACT_CMD);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleExtract() {
    if (!rawContent.trim() || rawContent.trim().length < 100) {
      setError('Paste the extracted data first. It should start with {"text":...');
      return;
    }
    setError(''); setStep('extracting');
    try {
      const res = await fetch('/api/admin/import-property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawContent: rawContent.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed'); setStep('input'); return; }
      setProperty(data.property);
      setStats(data);
      setStep('review');
    } catch (err: any) { setError(err.message); setStep('input'); }
  }

  function updateField(key: string, value: any) {
    setProperty((p: any) => ({ ...p, [key]: value }));
  }

  function addImage(target: string) {
    if (!imageUrl.trim().startsWith('http')) return;
    const url = imageUrl.trim();
    if (target === 'property') {
      updateField('images', [...(property.images || []), { url, alt: '', category: 'exterior', is_primary: !(property.images?.length), sort_order: property.images?.length || 0 }]);
    } else {
      const idx = parseInt(target);
      const rooms = [...property.rooms];
      rooms[idx] = { ...rooms[idx], images: [...(rooms[idx].images || []), url] };
      updateField('rooms', rooms);
    }
    setImageUrl(''); setAddingTo(null);
  }

  async function handleSave(status: 'draft' | 'published') {
    setSaving(true); setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Not logged in'); setSaving(false); return; }
      const slug = slugify(property.name || 'imported');
      const allP: number[] = [];
      (property.rooms || []).forEach((r: any) => {
        if (r.base_price > 0) allP.push(r.base_price);
        (r.rate_plans || []).forEach((rp: any) => { if (rp.price > 0) allP.push(rp.price); });
      });
      const { error: e } = await supabase.from('properties').insert({
        ...property, slug, owner_id: user.id, status,
        price_min: allP.length ? Math.min(...allP) : 0, price_max: allP.length ? Math.max(...allP) : 0,
        ...(status === 'published' ? { published_at: new Date().toISOString(), reviewed_by: user.id, reviewed_at: new Date().toISOString() } : {}),
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      });
      if (e) { setError('DB: ' + e.message); setSaving(false); return; }
      setStep('done');
    } catch (err: any) { setError(err.message); }
    setSaving(false);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/admin/dashboard" className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 mb-4"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center"><Download className="h-5 w-5 text-brand-600" /></div>
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900">Import Property</h1>
          <p className="text-sm text-slate-500">One command. One paste. Works with any hotel website.</p>
        </div>
      </div>

      {step === 'input' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex items-start gap-4">
              <span className="shrink-0 w-8 h-8 rounded-full bg-brand-600 text-white text-sm font-bold flex items-center justify-center mt-0.5">1</span>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">Open the hotel page in Chrome and scroll to bottom</p>
                <p className="text-sm text-slate-500 mt-1">Open MakeMyTrip, Agoda, Booking.com -- any hotel page. <strong>Scroll all the way down</strong> so all rooms load.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="shrink-0 w-8 h-8 rounded-full bg-brand-600 text-white text-sm font-bold flex items-center justify-center mt-0.5">2</span>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">Press F12, go to Console, paste this command, press Enter</p>
                <div className="mt-2 flex items-stretch gap-2">
                  <div className="flex-1 bg-slate-900 rounded-lg p-3 overflow-x-auto">
                    <code className="text-green-400 text-xs font-mono whitespace-nowrap select-all break-all">{EXTRACT_CMD.substring(0, 80)}...</code>
                  </div>
                  <button onClick={handleCopy}
                    className="shrink-0 flex items-center gap-1.5 px-4 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700">
                    {copied ? <><Check className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy Command</>}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">An alert will say "Done! X images captured"</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="shrink-0 w-8 h-8 rounded-full bg-brand-600 text-white text-sm font-bold flex items-center justify-center mt-0.5">3</span>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">Paste here (Ctrl+V) and click Extract</p>
                <textarea value={rawContent} onChange={e => setRawContent(e.target.value)} rows={6}
                  placeholder="Ctrl+V here after running the command..."
                  className="mt-2 w-full px-4 py-3 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-brand-500 outline-none resize-y" />
                {rawContent.length > 0 && <p className="text-xs text-slate-500 mt-1">{(rawContent.length / 1024).toFixed(0)} KB pasted</p>}
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><div>{error}</div>
              </div>
            )}

            <button onClick={handleExtract} disabled={!rawContent.trim()}
              className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white px-6 py-3.5 rounded-lg font-semibold hover:bg-brand-700 disabled:opacity-40 text-base">
              <Sparkles className="h-5 w-5" /> Extract Property Data
            </button>
          </div>
        </div>
      )}

      {step === 'extracting' && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Loader2 className="h-10 w-10 text-brand-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-lg font-heading font-bold text-slate-900 mb-2">Extracting...</h2>
          <p className="text-sm text-slate-500">Reading all rooms, rate plans, prices, images, amenities. 15-30 seconds.</p>
        </div>
      )}

      {step === 'review' && property && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="font-semibold text-green-800 flex items-center gap-2">
              <Check className="h-5 w-5" />
              {property.name} -- {stats?.roomCount || 0} rooms, {stats?.ratePlanCount || 0} rate plans, {(stats?.imageCount || 0) + (stats?.roomImageCount || 0)} photos
            </p>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

          {/* Basic Info */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="font-heading font-bold text-lg flex items-center gap-2"><Hotel className="h-5 w-5 text-brand-600" /> Basic Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="text-xs font-medium text-slate-600">Name</label>
                <input value={property.name} onChange={e => updateField('name', e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500" /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="text-xs font-medium text-slate-600">Type</label>
                  <select value={property.type} onChange={e => updateField('type', e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
                    <option value="hotel">Hotel</option><option value="homestay">Homestay</option><option value="resort">Resort</option><option value="guesthouse">Guesthouse</option><option value="villa">Villa</option></select></div>
                <div><label className="text-xs font-medium text-slate-600">Stars</label>
                  <select value={property.star_rating || ''} onChange={e => updateField('star_rating', Number(e.target.value) || null)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
                    <option value="">N/A</option>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
                <div><label className="text-xs font-medium text-slate-600">Area</label>
                  <select value={property.destination_slug} onChange={e => updateField('destination_slug', e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
                    <option value="dharamshala">Dharamshala</option><option value="mcleod-ganj">McLeod Ganj</option><option value="bhagsu">Bhagsu</option><option value="dharamkot">Dharamkot</option><option value="naddi">Naddi</option></select></div>
              </div>
            </div>
            <div><label className="text-xs font-medium text-slate-600">Description</label>
              <textarea value={property.description || ''} onChange={e => updateField('description', e.target.value)} rows={3} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none resize-y" /></div>
          </div>

          {/* Rooms */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="font-heading font-bold text-lg mb-4">Rooms ({property.rooms?.length || 0})</h2>
            {(property.rooms || []).map((room: any, idx: number) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-4 mb-4 last:mb-0">
                <div className="flex items-center justify-between mb-2">
                  <input value={room.name} onChange={e => { const r = [...property.rooms]; r[idx] = { ...r[idx], name: e.target.value }; updateField('rooms', r); }}
                    className="font-semibold text-sm flex-1 border-b border-transparent hover:border-slate-300 focus:border-brand-500 outline-none py-1" />
                  <button onClick={() => updateField('rooms', property.rooms.filter((_: any, i: number) => i !== idx))} className="text-xs text-red-500 ml-3">Remove</button>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-3">
                  <span>Bed: {room.bed_type}</span><span>Size: {room.room_size || '--'}</span><span>Max: {room.max_occupancy} guests</span>
                </div>

                {room.rate_plans?.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    <p className="text-xs font-semibold text-slate-700">Rate Plans ({room.rate_plans.length}):</p>
                    {room.rate_plans.map((rp: any, rpi: number) => (
                      <div key={rpi} className="flex justify-between items-center bg-slate-50 rounded px-3 py-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-slate-800 truncate">{rp.name}</span>
                          {rp.cancellation?.toLowerCase().includes('free') && <span className="shrink-0 px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-[10px]">Free Cancel</span>}
                        </div>
                        <span className="font-bold ml-3">{rp.price > 0 ? formatPrice(rp.price) : '--'}</span>
                      </div>
                    ))}
                  </div>
                )}
                {!room.rate_plans?.length && room.base_price > 0 && (
                  <p className="text-xs mb-3">Price: <strong>{formatPrice(room.base_price)}</strong></p>
                )}

                {/* Room images */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-500">{room.images?.length || 0} room photo(s)</span>
                    <button onClick={() => setAddingTo(String(idx))} className="text-xs text-brand-600 flex items-center gap-1"><LinkIcon className="h-3 w-3" /> Add URL</button>
                  </div>
                  {addingTo === String(idx) && (
                    <div className="flex gap-1.5 mb-2">
                      <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." onKeyDown={e => { if (e.key === 'Enter') addImage(String(idx)); }}
                        className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs outline-none" />
                      <button onClick={() => addImage(String(idx))} className="px-2 py-1 bg-brand-600 text-white rounded text-xs">Add</button>
                      <button onClick={() => { setAddingTo(null); setImageUrl(''); }} className="text-slate-400 text-xs">X</button>
                    </div>
                  )}
                  {room.images?.length > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {room.images.map((img: any, ii: number) => {
                        const src = typeof img === 'string' ? img : img?.url;
                        return src ? (
                          <div key={ii} className="relative shrink-0 w-16 h-12 rounded overflow-hidden bg-slate-100 group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt="" className="w-full h-full object-cover" />
                            <button onClick={() => { const r = [...property.rooms]; r[idx] = { ...r[idx], images: room.images.filter((_: any, i: number) => i !== ii) }; updateField('rooms', r); }}
                              className="absolute top-0 right-0 bg-red-500 text-white text-[8px] w-3.5 h-3.5 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-bl">x</button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Property Images */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-lg">Property Photos ({property.images?.length || 0})</h2>
              <button onClick={() => setAddingTo('property')} className="text-sm text-brand-600 flex items-center gap-1"><LinkIcon className="h-4 w-4" /> Add URL</button>
            </div>
            {addingTo === 'property' && (
              <div className="flex gap-2 mb-4">
                <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." onKeyDown={e => { if (e.key === 'Enter') addImage('property'); }}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" />
                <button onClick={() => addImage('property')} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm">Add</button>
                <button onClick={() => { setAddingTo(null); setImageUrl(''); }} className="text-slate-400 px-2">X</button>
              </div>
            )}
            {property.images?.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {property.images.map((img: any, i: number) => (
                  <div key={i} className="relative aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    <button onClick={() => updateField('images', property.images.filter((_: any, ii: number) => ii !== i))}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100">x</button>
                    {i === 0 && <span className="absolute top-1 left-1 bg-brand-600 text-white text-[9px] px-1.5 py-0.5 rounded">Primary</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-slate-400 py-4">Photos auto-extracted from page images. Add more via URL if needed.</p>
            )}
          </div>

          {/* SEO + Amenities compact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              <h2 className="font-heading font-bold">SEO</h2>
              <input value={property.meta_title || ''} onChange={e => updateField('meta_title', e.target.value)} placeholder="Meta title" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" />
              <textarea value={property.meta_description || ''} onChange={e => updateField('meta_description', e.target.value)} rows={2} placeholder="Meta description" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none resize-none" />
            </div>
            {property.amenities?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="font-heading font-bold mb-3">Amenities ({property.amenities.length})</h2>
                <div className="flex flex-wrap gap-1.5">{property.amenities.map((a: string, i: number) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">{a}</span>
                ))}</div>
              </div>
            )}
          </div>

          {/* Save bar */}
          <div className="flex items-center gap-3 sticky bottom-4 bg-white border border-slate-200 rounded-xl p-4 shadow-lg z-10">
            <button onClick={() => { setStep('input'); setProperty(null); }} className="text-sm text-slate-600 px-4 py-2.5">Back</button>
            <div className="flex-1" />
            <button onClick={() => handleSave('draft')} disabled={saving} className="flex items-center gap-1.5 px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-medium disabled:opacity-50"><Save className="h-4 w-4" /> Draft</button>
            <button onClick={() => handleSave('published')} disabled={saving} className="flex items-center gap-1.5 bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publish
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><Check className="h-8 w-8 text-green-600" /></div>
          <h2 className="text-xl font-heading font-bold mb-2">Imported!</h2>
          <p className="text-slate-600 mb-6">{property?.name} saved.</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => { setStep('input'); setRawContent(''); setProperty(null); }} className="px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">Import Another</button>
            <Link href="/admin/properties" className="px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700">View Properties</Link>
          </div>
        </div>
      )}
    </div>
  );
}
