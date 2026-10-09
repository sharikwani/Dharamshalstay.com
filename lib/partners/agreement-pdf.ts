import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/** Standard PDF fonts only cover Latin-1; replace what they cannot draw. */
export function toPdfSafe(text: string): string {
  return text
    .replace(/₹/g, 'Rs.')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/•/g, '-')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]+/g, '?');
}

export async function renderAgreementPdf(a: { title: string; body: string; version: string; signedName: string; signedAt: string; ip: string; email: string; sha256: string }): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const size = 10, lineGap = 14, margin = 50, width = 595 - margin * 2;
  let page = pdf.addPage([595, 842]);
  let y = 842 - margin;

  const newPage = () => { page = pdf.addPage([595, 842]); y = 842 - margin; };
  const write = (text: string, f = font, s = size) => {
    for (const para of toPdfSafe(text).split('\n')) {
      const words = para.split(' ');
      let line = '';
      const flush = () => { if (y < margin) newPage(); page.drawText(line, { x: margin, y, size: s, font: f, color: rgb(0.1, 0.1, 0.1) }); y -= lineGap; line = ''; };
      for (const w of words) {
        const next = line ? line + ' ' + w : w;
        if (f.widthOfTextAtSize(next, s) > width && line) { flush(); line = w; } else line = next;
      }
      flush();
    }
  };

  write(a.title, bold, 16); y -= 6;
  write(a.body);
  y -= 10;
  write('Signed electronically', bold, 12);
  write(`Name: ${a.signedName}\nEmail: ${a.email}\nDate and time (UTC): ${a.signedAt}\nIP address: ${a.ip}\nAgreement version: ${a.version}\nSHA-256 of agreement text: ${a.sha256}`);
  return pdf.save();
}
