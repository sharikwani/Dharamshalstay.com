import { Metadata } from 'next';
import { Phone, Mail, MapPin, Clock, MessageCircle } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Cards';
import InquiryForm from '@/components/forms/InquiryForm';
import { generateSEO } from '@/lib/seo';
import { siteConfig } from '@/lib/config';
import { getWhatsAppLink } from '@/lib/utils';

export const metadata: Metadata = generateSEO({ title: 'Contact Dharamshala Stay', description: 'Contact us for hotel bookings, trek inquiries, taxi services.', path: '/contact' });

export default function ContactPage() {
  return (
    <>
      <section className="bg-brand-900 text-white py-10"><div className="max-w-7xl mx-auto px-4 sm:px-6"><Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Contact' }]} /><h1 className="text-3xl font-heading font-bold mt-2">Contact Us</h1><p className="text-blue-200">Hotels, treks, taxis — our local team is ready to help.</p></div></section>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-4">
            <a href={getWhatsAppLink('Hi! Question about Dharamshala.')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100"><MessageCircle className="h-5 w-5 text-green-600" /><div><p className="font-medium text-slate-900">WhatsApp (Fastest)</p><p className="text-sm text-slate-600">{siteConfig.phone}</p></div></a>
            <a href={`tel:${siteConfig.phone}`} className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"><Phone className="h-5 w-5 text-brand-600" /><div><p className="font-medium">Phone</p><p className="text-sm text-slate-600">{siteConfig.phone}</p></div></a>
            <a href={`mailto:${siteConfig.email}`} className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"><Mail className="h-5 w-5 text-brand-600" /><div><p className="font-medium">Email</p><p className="text-sm text-slate-600">{siteConfig.email}</p></div></a>
            <div className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-xl"><MapPin className="h-5 w-5 text-brand-600 mt-0.5" /><div><p className="font-medium">Office</p><p className="text-sm text-slate-600">{siteConfig.address}</p></div></div>
            <div className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-xl"><Clock className="h-5 w-5 text-brand-600 mt-0.5" /><div><p className="font-medium">Response Time</p><p className="text-sm text-slate-600">Within 2 hours (9AM–9PM IST)</p></div></div>
          </div>
          <div className="lg:col-span-2"><InquiryForm type="general" title="Send Us a Message" subtitle="Tell us about your travel plans." /></div>
        </div>
      </section>
    </>
  );
}
