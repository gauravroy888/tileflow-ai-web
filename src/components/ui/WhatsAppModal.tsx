import { useState } from 'react';
import { X, MessageCircle, FileText, BookOpen, Bell, Send, Sparkles, Loader2, Check } from 'lucide-react';
import { Button } from './Button';
import type { Customer } from '../../types';
import { supabase } from '../../lib/supabase';

interface WhatsAppModalProps {
  customer: Customer;
  shopName?: string;
  retailerName?: string;
  catalogueUrl?: string;
  onClose: () => void;
}

type TemplateKey = 'quick' | 'quote' | 'catalogue' | 'followup' | 'ai';

const TEMPLATES: Record<TemplateKey, { icon: any; label: string; color: string; bg: string }> = {
  quick: {
    icon: MessageCircle,
    label: 'Quick Message',
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
  },
  quote: {
    icon: FileText,
    label: 'Send Quote',
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200',
  },
  catalogue: {
    icon: BookOpen,
    label: 'Share Catalogue',
    color: 'text-orange-600',
    bg: 'bg-orange-50 border-orange-200',
  },
  followup: {
    icon: Bell,
    label: 'Follow-up Update',
    color: 'text-green-600',
    bg: 'bg-green-50 border-green-200',
  },
  ai: {
    icon: Sparkles,
    label: 'AI Magic Draft',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50 border-indigo-200',
  },
};

function buildMessage(type: TemplateKey, customer: Customer, shopName: string, retailerName: string, catalogueUrl: string): string {
  const name = customer.name.split(' ')[0];
  switch (type) {
    case 'quick':
      return `Hi ${name}! 👋 I'm reaching out from *${shopName}*. How can I help you today?`;
    case 'quote':
      const productsLine = customer.required_products ? `🛒 *Products Required:* ${customer.required_products}\n` : '';
      return (
        `Hi ${name}! 👋\n\n` +
        `Here is your personalized quote from *${shopName}*:\n\n` +
        `📋 *Project Type:* ${customer.project_type || 'General'}\n` +
        productsLine +
        `📍 *Location:* ${customer.location || 'N/A'}\n` +
        `💰 *Estimated Budget:* ${customer.budget ? `₹${customer.budget.toLocaleString('en-IN')}` : 'To be discussed'}\n\n` +
        `Our team will prepare a detailed quote based on your requirements. ` +
        `Please reply to confirm or let us know if you'd like any changes.\n\n` +
        `Thank you for choosing *${shopName}*! 🙏`
      );
    case 'catalogue':
      return (
        `Hi ${name}! 👋\n\n` +
        `Check out our latest collection at *${shopName}*! 🏠✨\n\n` +
        `🔗 View our full catalogue here:\n${catalogueUrl}\n\n` +
        `We have an amazing range of tiles, flooring & home decor to transform your space. ` +
        `Feel free to reach out for any queries!\n\n` +
        `*${shopName}* 🙏`
      );
    case 'followup':
      if (customer.ai_draft_message) {
        return customer.ai_draft_message;
      }
      return (
        `Hi ${name}! 👋\n\n` +
        `This is a friendly follow-up from *${shopName}*.\n\n` +
        `We noticed you visited us recently and wanted to check if you had any questions ` +
        `or if you'd like to proceed with your ${customer.project_type || 'project'}.\n\n` +
        `We're here to help! Feel free to reply anytime. 😊\n\n` +
        `${retailerName ? `*${retailerName}*\n` : ''}` +
        `*${shopName}* Team`
      );
    case 'ai':
      return '';
  }
}

export function WhatsAppModal({ customer, shopName = 'Our Store', retailerName = '', catalogueUrl = window.location.origin, onClose }: WhatsAppModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey | null>(null);
  const [message, setMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSelectTemplate = async (type: TemplateKey) => {
    setSelectedTemplate(type);
    if (type !== 'ai') {
      setMessage(buildMessage(type, customer, shopName, retailerName, catalogueUrl));
    } else {
      setMessage('');
      setIsGenerating(true);
      try {
        const prompt = `Write a short, professional, and friendly WhatsApp follow-up message to a retail customer from the shop "${shopName}".
Customer Name: ${customer.name}
Project Type: ${customer.project_type || 'General Inquiry'}
Budget: ${customer.budget || 'Not specified'}
Required Products: ${customer.required_products || 'Not specified'}
Customer Notes: ${customer.notes || 'None'}
Status: ${customer.visit_status}

Rules:
- Keep it under 4 sentences.
- Use emojis sparingly.
- Be conversational and polite.
- Do NOT include any placeholders, use the actual variables provided.`;
        
        const { data, error } = await supabase.functions.invoke('gemini-proxy', {
          body: { action: 'chat', prompt, history: [] }
        });

        if (error) throw error;
        setMessage(data.text.trim());
      } catch (error) {
        console.error('Failed to generate AI message:', error);
        setMessage('Oops! Failed to generate the AI message. Please check your API key and try again.');
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    
    // Clean phone: strip non-numeric except leading +
    const rawPhone = customer.phone || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    const phone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

    // Split routing: Only 'followup' goes through the background API
    if (selectedTemplate === 'followup') {
      setIsSending(true);
      setSendSuccess(false);

      try {
        const { data, error } = await supabase.functions.invoke('whatsapp-sender', {
          body: { phone, message }
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        setSendSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      } catch (error) {
        console.error('Failed to send WhatsApp message:', error);
        alert('Failed to send message automatically. Please make sure the customer has messaged you within 24 hours, or check the console for details.');
      } finally {
        setIsSending(false);
      }
    } else {
      // All other methods open the retailer's personal WhatsApp app
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-surface w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
              <MessageCircle size={16} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-textPrimary leading-tight">WhatsApp</h3>
              <p className="text-xs text-textSecondary">{customer.name} · {customer.phone || 'No phone'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Template Picker */}
          <div>
            <p className="text-xs font-semibold text-textSecondary uppercase tracking-wide mb-2">Choose Template</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(TEMPLATES) as TemplateKey[]).map((key) => {
                const t = TEMPLATES[key];
                const Icon = t.icon;
                const isSelected = selectedTemplate === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleSelectTemplate(key)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? `${t.bg} border-2 ${t.color.replace('text-', 'border-')}`
                        : 'border-border bg-background hover:bg-surface'
                    }`}
                  >
                    <Icon size={18} className={isSelected ? t.color : 'text-textSecondary'} />
                    <span className={`text-xs font-medium ${isSelected ? t.color : 'text-textPrimary'}`}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message Editor */}
          {selectedTemplate && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-textSecondary uppercase tracking-wide">Message Preview</p>
                {!isGenerating && <span className="text-xs text-textSecondary">{message.length} chars</span>}
              </div>
              
              {isGenerating ? (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 flex flex-col items-center justify-center text-indigo-500 mb-2">
                  <Loader2 size={24} className="animate-spin mb-2" />
                  <p className="text-sm font-medium">AI is drafting your message...</p>
                </div>
              ) : (
                <>
                  {/* WhatsApp-style bubble preview */}
                  <div className="bg-[#e9feea] rounded-2xl rounded-tr-sm p-3 mb-2 shadow-sm border border-green-100">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{message}</p>
                  </div>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={5}
                    placeholder="Edit your message..."
                    className="w-full border border-border rounded-xl px-3 py-2.5 bg-background text-textPrimary focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none"
                  />
                  <p className="text-xs text-textSecondary mt-1">✏️ You can edit the message above before sending</p>
                </>
              )}
            </div>
          )}

          {!selectedTemplate && (
            <div className="text-center py-6 text-textSecondary">
              <MessageCircle size={36} className="mx-auto mb-2 text-green-400" />
              <p className="text-sm">Select a template above to get started</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex gap-3 shrink-0">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} disabled={!message.trim() || isSending || sendSuccess || !customer.phone} className="flex-1 bg-green-500 hover:bg-green-600">
            {isSending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Sending...
              </>
            ) : sendSuccess ? (
              <>
                <Check size={18} className="mr-2" />
                Sent!
              </>
            ) : (
              <>
                <Send size={18} className="mr-2" />
                Send via WhatsApp
              </>
            )}
          </Button>
        </div>
        {!customer.phone && (
          <p className="text-center text-xs text-red-500 pb-3">⚠️ No phone number saved for this customer</p>
        )}
      </div>
    </div>
  );
}
