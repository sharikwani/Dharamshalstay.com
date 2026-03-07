'use client';
import { MessageCircle } from 'lucide-react';
import { getWhatsAppLink } from '@/lib/utils';

export default function WhatsAppButton() {
  return (
    <a href={getWhatsAppLink('Hi! I need help planning my Dharamshala trip.')} target="_blank" rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white pl-4 pr-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-all">
      <MessageCircle className="h-5 w-5" /><span className="text-sm font-medium hidden sm:inline">WhatsApp Us</span>
    </a>
  );
}

