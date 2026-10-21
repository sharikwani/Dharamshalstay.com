'use client';
import { useState } from 'react';
import { Share2, Download, MessageCircle, Instagram, Check } from 'lucide-react';

/** Share the certificate image itself (phone share sheet: Instagram, WhatsApp...), or download it, or send the link. */
export default function ShareCertificate({ imageUrl, pageUrl, text, fileName }: { imageUrl: string; pageUrl: string; text: string; fileName: string }) {
  const [note, setNote] = useState<string | null>(null);

  async function file(): Promise<File> {
    const blob = await (await fetch(imageUrl)).blob();
    return new File([blob], fileName, { type: blob.type || 'image/png' });
  }

  async function share() {
    setNote(null);
    try {
      const f = await file();
      if (navigator.canShare?.({ files: [f] })) { await navigator.share({ files: [f], text: text + ' ' + pageUrl }); return; }
      if (navigator.share) { await navigator.share({ title: text, text, url: pageUrl }); return; }
      await download();
    } catch (e: any) { if (e?.name !== 'AbortError') setNote('Sharing did not work here. Download the image and post it instead.'); }
  }

  async function download() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(await file());
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  async function instagram() {
    await download();
    setNote('Saved. Open Instagram and post it from your gallery, or add it to your story. Tag @thedharamshalastay!');
  }

  const btn = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold';
  return (
    <div className="space-y-3">
      <button onClick={share} className={btn + ' w-full bg-orange-600 text-white hover:bg-orange-700'}><Share2 className="h-5 w-5" />Share certificate</button>
      <div className="grid grid-cols-3 gap-2">
        <a href={'https://wa.me/?text=' + encodeURIComponent(text + ' ' + pageUrl)} target="_blank" rel="noopener noreferrer" className={btn + ' bg-green-600 text-white hover:bg-green-700 text-sm'}><MessageCircle className="h-4 w-4" />WhatsApp</a>
        <button onClick={instagram} className={btn + ' bg-gradient-to-r from-fuchsia-600 to-orange-500 text-white text-sm'}><Instagram className="h-4 w-4" />Instagram</button>
        <button onClick={download} className={btn + ' bg-slate-100 text-slate-800 hover:bg-slate-200 text-sm'}><Download className="h-4 w-4" />Save</button>
      </div>
      {note && <p className="flex gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><Check className="h-4 w-4 shrink-0 mt-0.5 text-green-600" />{note}</p>}
    </div>
  );
}
