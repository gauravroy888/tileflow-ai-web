import { useState, useRef, useEffect } from 'react';
import { ArrowRight, Camera, Check, ClipboardList, PackageSearch, Plus, Send, Sparkles, TrendingUp, X, Image as ImageIcon, Download, Phone, History, Share2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { useRetailProfile } from '../components/providers/RetailProfileProvider';
import ReactMarkdown from 'react-markdown';
import { Menu, MessageSquare, Plus as PlusIcon, Trash2, Clock } from 'lucide-react';
import type { Product, Customer, ChatSession, AIGeneratedImage } from '../types';
import { uploadToR2 } from '../lib/r2Storage';

type ToolType = string | null;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const chatSuggestions = [
  { label: 'Showroom follow-ups', prompt: 'Which customers should I follow up with today?', icon: ClipboardList, tone: 'bg-primary/10 text-primary' },
  { label: 'Check my stock', prompt: 'What products do I currently have in my catalogue?', icon: PackageSearch, tone: 'bg-warning/10 text-warning' },
  { label: 'Sales idea', prompt: 'Suggest a simple way to improve sales this week.', icon: TrendingUp, tone: 'bg-accent/10 text-accent' },
];

const AI = () => {
  const { profile } = useRetailProfile();

  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Tools State
  const [activeTool, setActiveTool] = useState<ToolType>(null);
  const [toolPrompt, setToolPrompt] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImageMime, setUploadedImageMime] = useState<string>('image/jpeg');
  const [generatedText, setGeneratedText] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [loadingTool, setLoadingTool] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Inventory Attachment State
  const [shopId, setShopId] = useState<string | null>(null);
  const [shopProducts, setShopProducts] = useState<Product[]>([]);
  const [shopCustomers, setShopCustomers] = useState<Customer[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Image History State
  const [generatedImagesHistory, setGeneratedImagesHistory] = useState<AIGeneratedImage[]>([]);
  const [isImageHistoryOpen, setIsImageHistoryOpen] = useState(false);

  // Share State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareCustomerSearch, setShareCustomerSearch] = useState('');
  const [shareCurrentImageUrl, setShareCurrentImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchShopAndProducts = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('id', session.user.id)
        .single();
        
      if (profile) {
        setShopId(profile.shop_id);
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .eq('shop_id', profile.shop_id)
          .order('created_at', { ascending: false });
          
        if (products) setShopProducts(products as Product[]);
        
        const { data: customers } = await supabase
          .from('customers')
          .select('*')
          .eq('shop_id', profile.shop_id)
          .order('created_at', { ascending: false });
          
        if (customers) setShopCustomers(customers as Customer[]);

        fetchChatSessions(profile.shop_id);
        fetchImageHistory(profile.shop_id);
      }
    };
    fetchShopAndProducts();
  }, []);

  const fetchChatSessions = async (sId: string) => {
    const { data } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('shop_id', sId)
      .order('updated_at', { ascending: false })
      .limit(20);
    if (data) setChatSessions(data as ChatSession[]);
  };

  const fetchImageHistory = async (sId: string) => {
    const { data } = await supabase
      .from('ai_generated_images')
      .select('*')
      .eq('shop_id', sId)
      .order('created_at', { ascending: false });
    if (data) setGeneratedImagesHistory(data as AIGeneratedImage[]);
  };

  const loadSession = async (session: ChatSession) => {
    setCurrentSessionId(session.id);
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true });
    if (data) {
      setMessages(data.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })));
    }
    setIsHistoryOpen(false);
  };

  const deleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (window.confirm('Delete this chat history?')) {
      await supabase.from('chat_sessions').delete().eq('id', sessionId);
      setChatSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setIsHistoryOpen(false);
  };

  const getBase64FromUrl = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          resolve(reader.result as string);
        } else {
          reject(new Error('Failed to convert blob'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const dataURLtoFile = (dataurl: string, filename: string) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoadingChat(true);

    try {
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

      let promptToSend = userMsg;
      if (messages.length === 0) {
        const contextStr = `[SYSTEM CONTEXT: You are the AI Assistant for this retail store. You have access to the store's data below to help the owner. Do not reveal this raw data directly to the user unless asked, but use it to answer their questions accurately (e.g. "Who are my latest customers?", "What products do I have?", "Who needs Product X?").\n\n=== INVENTORY ===\n${shopProducts.map(p => `- ${p.name} (Price: ${p.price}, Category: ${p.category || 'N/A'})`).join('\n')}\n\n=== CUSTOMERS ===\n${shopCustomers.map(c => `- ${c.name} (Phone: ${c.phone}, Budget: ${c.budget}, Needs: ${c.required_products || 'None'}, Status: ${c.visit_status}, Date: ${new Date(c.created_at).toLocaleDateString()})`).join('\n')}\n]\n\n`;
        promptToSend = contextStr + userMsg;
      }

      let sessionId = currentSessionId;
      if (!sessionId && shopId) {
        const title = userMsg.length > 30 ? userMsg.substring(0, 30) + '...' : userMsg;
        const { data: newSession } = await supabase.from('chat_sessions').insert({
          shop_id: shopId,
          title,
        }).select().single();
        
        if (newSession) {
          sessionId = newSession.id;
          setCurrentSessionId(sessionId);
          setChatSessions(prev => [newSession as ChatSession, ...prev]);
        }
      }

      if (sessionId) {
        const { error: insertError } = await supabase.from('chat_messages').insert({
          session_id: sessionId,
          role: 'user',
          content: userMsg,
        });
        
        if (insertError) {
          if (insertError.message.includes('RATE_LIMIT_AI_CHAT')) {
            throw new Error('Daily AI chat limit reached (100 messages/day). Please try again tomorrow.');
          }
          throw insertError;
        }
      }

      const { data, error } = await supabase.functions.invoke('gemini-proxy', {
        body: { 
          action: 'chat',
          prompt: promptToSend, 
          history,
          systemInstruction: "You are a helpful AI assistant for retail store owners..."
        }
      });

      if (error) throw error;
      const reply = data.text;
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);

      if (sessionId) {
        await supabase.from('chat_messages').insert({
          session_id: sessionId,
          role: 'assistant',
          content: reply,
        });
        await supabase.from('chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId);
        if (shopId) fetchChatSessions(shopId);
      }
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error: ' + (error.message || 'Please try again.') }]);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImageMime(file.type || 'image/jpeg');
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRunTool = async () => {
    if (!toolPrompt.trim() && !uploadedImage) return;
    setLoadingTool(true);
    setLoadingStatus('Analyzing with Gemini...');
    setGeneratedText(null);
    setGeneratedImageUrl(null);
    setShareCurrentImageUrl(null);

    try {
      let prompt = '';
      const parts: any[] = [];
      const imageParts: any[] = [];

      const activeFeature = profile.aiFeatures.find(f => f.id === activeTool);
      if (!activeFeature) return;

      prompt = activeFeature.systemPrompt.replace('{prompt}', toolPrompt);

      if (['vision_with_image', 'image_generation'].includes(activeFeature.type) && uploadedImage) {
        const base64Data = uploadedImage.split(',')[1];
        imageParts.push({ inlineData: { mimeType: uploadedImageMime, data: base64Data } });
      }

      if (selectedProducts.length > 0) {
        prompt += `\n\nCRITICAL: Incorporate these exact products into the space:\n`;
        selectedProducts.forEach((p, index) => {
          prompt += `${index + 1}. ${p.name} (Category: ${p.category || 'N/A'}, Color: ${p.color || 'N/A'}, Material: ${p.material || 'N/A'})\n`;
        });
        
        for (const product of selectedProducts) {
          if (product.image_url) {
            try {
              const base64DataUrl = await getBase64FromUrl(product.image_url);
              const match = base64DataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,([^"]*)$/);
              if (match) {
                 imageParts.push({ inlineData: { mimeType: match[1], data: match[2] } });
              }
            } catch (err) {
               console.error("Failed to load product image", err);
            }
          }
        }
      }

      parts.push({ text: prompt });
      parts.push(...imageParts);

      // If this is purely a chat/vision text task with no image output expected, just use Gemini
      if (activeFeature.type !== 'vision_with_image' && activeFeature.type !== 'image_generation') {
        const { data: visionData, error: visionError } = await supabase.functions.invoke('gemini-proxy', {
          body: {
            action: 'vision',
            parts: [{ text: prompt }],
            imageParts: imageParts
          }
        });
        if (visionError) throw visionError;
        setGeneratedText(visionData.text);
      } else {
        // This is an image generation/editing task. Go straight to the image proxy.
        setLoadingStatus('Generating image with OpenAI...');
        try {
          const { data: authData } = await supabase.auth.getSession();
          const userId = authData?.session?.user?.id;
          
          if (!userId) throw new Error("Not authenticated");

          // Check Rate Limit by inserting log
          const { error: usageError } = await supabase.from('ai_usage_logs').insert({
            shop_id: shopId,
            user_id: userId,
            action_type: 'image_generation'
          });

          if (usageError) {
            if (usageError.message.includes('RATE_LIMIT_AI_IMAGE')) {
              throw new Error('Daily AI image limit reached (50 images/day). Please try again tomorrow.');
            }
            throw usageError;
          }

          const { data, error } = await supabase.functions.invoke('gemini-proxy', {
            body: {
              action: 'generateImage',
              parts: parts,
              imageParts: imageParts // Pass the base image and product images directly to OpenAI
            }
          });

          if (error) {
            let msg = error.message;
            if (error.context) {
              try {
                const errData = await error.context.json();
                if (errData && errData.error) {
                  msg = errData.error;
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
            throw new Error('Edge Function Error: ' + msg);
          }
          
          let imageGenerated = false;
          for (const candidate of data.candidates || []) {
            for (const part of (candidate.content?.parts || [])) {
              if (part.inlineData) {
                const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                setGeneratedImageUrl(dataUrl);
                imageGenerated = true;
                setGeneratedText("Here is your newly designed space, incorporating your selected products!");
                
                // Save to history and R2
                try {
                  const filename = `gen_${Date.now()}.png`;
                  const file = dataURLtoFile(dataUrl, filename);
                  uploadToR2(file, filename).then((hostedUrl: string) => {
                    if (hostedUrl) {
                      supabase.from('ai_generated_images').insert({
                        shop_id: shopId,
                        generated_image_url: hostedUrl,
                        prompt: toolPrompt
                      }).select().single().then(({ data: newRec }) => {
                        if (newRec) {
                          setGeneratedImagesHistory(prev => [newRec as AIGeneratedImage, ...prev]);
                          // Pre-populate share URL with hosted URL if they want to share immediately
                          setShareCurrentImageUrl(hostedUrl);
                        }
                      });
                    }
                  });
                } catch (uploadErr) {
                  console.error("Failed to host generated image:", uploadErr);
                }
                
                break;
              }
            }
            if (imageGenerated) break;
          }

          if (!imageGenerated) {
            throw new Error('OpenAI returned no image. Response: ' + JSON.stringify(data).substring(0, 300));
          }
        } catch (imgErr: any) {
          console.error('OpenAI Image Generation Error:', imgErr);
          alert('Image Generation failed:\n\n' + (imgErr.message || 'Unknown error') + '\n\nCheck console for details.');
        }
      }
    } catch (error: any) {
      console.error(error);
      alert('Error: ' + (error.message || 'Something went wrong'));
    } finally {
      setLoadingTool(false);
    }
  };

  return (
    <div className="assistant-workspace flex min-h-0 flex-col bg-background">
      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        
        {!activeTool ? (
          <div className="h-full overflow-y-auto p-4 pb-8 sm:p-6">
            <div className="mx-auto max-w-screen-xl">
              <header className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="eyebrow">AI studio</p>
                  <h2 className="mt-0.5 text-2xl font-extrabold tracking-tight text-textPrimary">Create with your catalogue</h2>
                  <p className="mt-1 text-sm text-textSecondary">Turn a showroom conversation into a clear next step.</p>
                </div>
                <div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-accentSoft text-accent sm:flex"><Sparkles size={19} /></div>
              </header>

              {(() => {
                const heroFeature = profile.aiFeatures.find(f => f.isHero);
                if (!heroFeature) return null;
                const HeroIcon = heroFeature.icon;
                return (
                  <button onClick={() => setActiveTool(heroFeature.id)} className="group relative w-full overflow-hidden rounded-2xl bg-hero p-5 text-left text-heroText shadow-[0_16px_32px_rgba(13,45,77,0.18)] transition-transform hover:-translate-y-0.5">
                    <div className="absolute -right-9 -top-10 h-40 w-40 rounded-full border-[18px] border-heroText/10" />
                    <div className="absolute bottom-4 right-5 grid grid-cols-3 gap-1 opacity-35"><span className="h-6 w-6 rounded-md border border-heroText/50" /><span className="h-6 w-6 rounded-md border border-heroText/30" /><span className="h-6 w-6 rounded-md border border-heroText/40" /><span className="h-6 w-6 rounded-md border border-heroText/30" /><span className="h-6 w-6 rounded-md border border-heroText/50" /><span className="h-6 w-6 rounded-md border border-heroText/30" /></div>
                    <div className="relative flex max-w-md items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-heroText/20 text-heroText"><HeroIcon size={21} /></div>
                      <div className="min-w-0 flex-1"><p className="text-sm font-extrabold">{heroFeature.title}</p><p className="mt-1 text-sm leading-5 text-heroText/70">{heroFeature.description}</p><span className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold text-heroText">{heroFeature.buttonText || 'Use Tool'} <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" /></span></div>
                    </div>
                  </button>
                );
              })()}

              <div className="mt-5 flex items-center gap-2"><span className="h-px flex-1 bg-border" /><p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-textSecondary">Other ways to work</p><span className="h-px flex-1 bg-border" /></div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {profile.aiFeatures.filter(f => !f.isHero).map((tool) => {
                  const Icon = tool.icon;
                  return <button key={tool.id} onClick={() => setActiveTool(tool.id)} className="group min-h-40 rounded-2xl border border-border bg-surface p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tool.color}`}><Icon size={19} /></div><h3 className="mt-5 text-sm font-extrabold text-textPrimary">{tool.title}</h3><p className="mt-1 text-xs leading-5 text-textSecondary">{tool.description}</p><ArrowRight size={15} className="mt-3 text-textSecondary transition-transform group-hover:translate-x-1 group-hover:text-primary" /></button>;
                })}
              </div>
              <p className="mt-5 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-3 text-xs leading-5 text-primary"><span className="font-extrabold">Tip:</span> Add product images from your catalogue for a concept that is closer to what you can actually sell.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Unified Header */}
            <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 shrink-0">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => { setActiveTool(null); setUploadedImage(null); setGeneratedText(null); setToolPrompt(''); }} 
                  className="rounded-xl bg-sand px-3 py-2 text-xs font-extrabold text-textSecondary transition-colors hover:bg-primary hover:text-background"
                >
                  ← Back
                </button>
                <h3 className="text-base font-extrabold text-textPrimary">
                  {profile.aiFeatures.find(f => f.id === activeTool)?.title || 'AI Tool'}
                </h3>
              </div>
              <div className="flex gap-2">
                {['vision_with_image', 'image_generation'].includes(profile.aiFeatures.find(f => f.id === activeTool)?.type || '') && (
                  <button 
                    onClick={() => setIsImageHistoryOpen(true)}
                    className="rounded-xl bg-surfaceHover px-3 py-2 text-xs font-bold text-textPrimary flex items-center gap-2 border border-border shadow-sm hover:border-primary/50 transition-colors"
                  >
                    <History size={16} /> History
                  </button>
                )}
                {activeTool === 'chat' && (
                  <button 
                    onClick={() => setIsHistoryOpen(true)}
                    className="rounded-xl bg-surfaceHover px-3 py-2 text-xs font-bold text-textPrimary flex items-center gap-2 border border-border shadow-sm hover:border-primary/50 transition-colors"
                  >
                    <Menu size={16} /> History
                  </button>
                )}
              </div>
            </div>

            {activeTool === 'chat' ? (
              // CHAT VIEW
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto bg-background p-4">
                  {messages.length === 0 && (
                    <div className="mx-auto flex min-h-full max-w-xl flex-col justify-center py-3">
                      <section className="relative overflow-hidden rounded-3xl bg-hero px-5 py-6 text-heroText shadow-[0_18px_35px_rgba(13,45,77,0.18)]">
                        <div className="absolute -right-7 -top-8 h-28 w-28 rounded-full border-[14px] border-heroText/10" />
                        <div className="absolute bottom-3 right-7 text-heroText/10"><Sparkles size={62} strokeWidth={1.3} /></div>
                        <div className="relative">
                          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-heroText/20 text-heroText"><Sparkles size={20} /></div>
                          <p className="text-lg font-extrabold tracking-tight">Your showroom co-pilot</p>
                          <p className="mt-1 max-w-sm text-sm leading-5 text-heroText/75">Ask about customers, products, or the next best move for your business.</p>
                          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-heroText/20 px-2.5 py-1 text-[11px] font-bold text-heroText/90"><span className="h-1.5 w-1.5 rounded-full bg-success" /> Ready with your store context</div>
                        </div>
                      </section>

                      <div className="mt-6 flex items-center gap-2"><span className="h-px flex-1 bg-border" /><p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-textSecondary">Try a quick question</p><span className="h-px flex-1 bg-border" /></div>
                      <div className="mt-3 grid gap-2.5">
                        {chatSuggestions.map((suggestion) => {
                          const Icon = suggestion.icon;
                          return (
                            <button key={suggestion.label} onClick={() => setInput(suggestion.prompt)} className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
                              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${suggestion.tone}`}><Icon size={17} /></span>
                              <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-textPrimary">{suggestion.label}</span><span className="mt-0.5 block truncate text-xs text-textSecondary">{suggestion.prompt}</span></span>
                              <ArrowRight size={16} className="shrink-0 text-textSecondary transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-4 px-1 text-center text-xs leading-5 text-textSecondary">I use your saved catalogue and customer information to give more useful answers.</p>
                    </div>
                  )}
                  {messages.length > 0 && (
                    <div className="mx-auto max-w-2xl space-y-4">
                      <p className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-center text-xs text-primary"><span className="font-extrabold">Retail context enabled.</span> Your catalogue and customer records inform this chat.</p>
                      {messages.map((msg, i) => (
                        <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {msg.role === 'assistant' && <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-background"><Sparkles size={15} /></span>}
                          <div className={`max-w-[80%] px-3.5 py-3 text-sm leading-6 overflow-hidden ${
                            msg.role === 'user' 
                              ? 'rounded-2xl rounded-br-md bg-primary text-background shadow-sm' 
                              : 'rounded-2xl rounded-bl-md border border-border bg-surface text-textPrimary shadow-sm'
                          }`}>
                            {msg.role === 'assistant' ? (
                              <ReactMarkdown
                                components={{
                                  h1: ({node, ...props}) => <h1 className="text-lg font-bold mb-2" {...props} />,
                                  h2: ({node, ...props}) => <h2 className="text-md font-bold mt-4 mb-2" {...props} />,
                                  h3: ({node, ...props}) => <h3 className="text-sm font-bold mt-3 mb-1" {...props} />,
                                  p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                  ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
                                  ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
                                  li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
                                  strong: ({node, ...props}) => <strong className="font-semibold text-textPrimary" {...props} />,
                                }}
                              >
                                {msg.content}
                              </ReactMarkdown>
                            ) : (
                              msg.content
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {loadingChat && (
                    <div className="mx-auto mt-4 flex max-w-2xl justify-start gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-background"><Sparkles size={15} /></span>
                      <div className="rounded-2xl rounded-bl-md border border-border bg-surface px-3.5 py-3 text-sm text-textSecondary shadow-sm"><span className="inline-flex gap-1"><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-textSecondary [animation-delay:-0.2s]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-textSecondary [animation-delay:-0.1s]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-textSecondary" /></span></div>
                    </div>
                  )}
                </div>
                <div className="border-t border-border bg-surface/95 p-3 backdrop-blur shrink-0">
                  <form onSubmit={handleSendMessage} className="mx-auto flex max-w-2xl items-center gap-2 rounded-2xl border border-border bg-background p-1.5 shadow-sm transition-shadow focus-within:border-primary/35 focus-within:shadow-[0_0_0_3px_rgba(13,45,77,0.08)]">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask about your business..."
                      className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-textPrimary outline-none placeholder:text-textSecondary"
                      disabled={loadingChat}
                    />
                    <Button type="submit" size="icon" className="h-9 w-9 rounded-xl shrink-0" disabled={loadingChat || !input.trim()}>
                      <Send size={16} />
                    </Button>
                  </form>
                </div>
              </div>
            ) : (
              // OTHER TOOLS VIEW
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {['vision_with_image', 'image_generation'].includes(profile.aiFeatures.find(f => f.id === activeTool)?.type || '') && (
                  <div>
                    <label className="block text-sm font-medium text-textPrimary mb-2">Upload Photo</label>
                    {uploadedImage ? (
                      <div className="relative aspect-video bg-sand rounded-xl overflow-hidden border border-border">
                        <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-cover" />
                        <button onClick={() => setUploadedImage(null)} className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70">
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center text-textSecondary hover:bg-sand/50 hover:border-primary cursor-pointer transition-colors text-center"
                        >
                          <ImageIcon size={28} className="mb-2 text-textSecondary/50" />
                          <p className="text-sm font-medium">Upload Photo</p>
                        </div>
                        <div 
                          onClick={() => cameraInputRef.current?.click()}
                          className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center text-textSecondary hover:bg-sand/50 hover:border-primary cursor-pointer transition-colors text-center"
                        >
                          <Camera size={28} className="mb-2 text-textSecondary/50" />
                          <p className="text-sm font-medium">Take Photo</p>
                        </div>
                      </div>
                    )}
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                    <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleImageUpload} className="hidden" />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-textPrimary mb-2">Instructions</label>
                  <textarea
                    value={toolPrompt}
                    onChange={(e) => setToolPrompt(e.target.value)}
                    placeholder={
                      profile.aiFeatures.find(f => f.id === activeTool)?.type === 'image_generation' 
                        ? "e.g. A modern minimalist showroom with bright lighting..." 
                        : "Describe what you want to do..."
                    }
                    className="w-full border border-border rounded-xl p-3 bg-surface text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-textPrimary mb-2">Attach from Inventory (Up to 5)</label>
                  <div className="flex items-center gap-3 overflow-x-auto pb-2">
                    {selectedProducts.map(p => (
                      <div key={p.id} className="relative w-20 h-20 rounded-xl bg-sand shrink-0 border border-border">
                         {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover rounded-xl" />
                         ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-textSecondary/50">No Img</div>
                         )}
                         <button onClick={() => setSelectedProducts(prev => prev.filter(sp => sp.id !== p.id))} className="absolute -top-2 -right-2 bg-black text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-500 shadow-md">
                           <X size={14} />
                         </button>
                      </div>
                    ))}
                    {selectedProducts.length < 5 && (
                      <button onClick={() => setIsPickerOpen(true)} className="flex flex-col items-center justify-center px-4 py-2 h-20 bg-surface border-2 border-dashed border-border rounded-xl text-textSecondary font-medium hover:bg-sand/50 hover:border-primary hover:text-primary transition-colors shrink-0">
                        <Plus size={20} className="mb-1" />
                        <span className="text-[10px] whitespace-nowrap">Add Item</span>
                      </button>
                    )}
                  </div>
                </div>

                <Button 
                  className="w-full py-4 text-lg"
                  onClick={handleRunTool}
                  disabled={loadingTool || (!toolPrompt.trim() && !uploadedImage)}
                >
                  {loadingTool ? (
                    <span className="flex items-center gap-2 animate-pulse"><Sparkles size={20} /> {loadingStatus || 'Generating...'}</span>
                  ) : 'Generate Design & Image'}
                </Button>

                {generatedImageUrl && (
                  <div className="mt-6 space-y-3">
                    <div className="rounded-2xl overflow-hidden border border-border shadow-md">
                      <img src={generatedImageUrl} alt="Generated Design" className="w-full h-auto object-cover" />
                    </div>
                    <div className="flex gap-3">
                      <Button variant="secondary" className="flex-1 py-3" onClick={() => {
                        const a = document.createElement('a');
                        a.href = generatedImageUrl;
                        a.download = `ai_design_${Date.now()}.png`;
                        a.click();
                      }}>
                        <Download size={18} className="mr-2" /> Download
                      </Button>
                      <Button 
                        className="flex-1 py-3 bg-[#25D366] hover:bg-[#128C7E] text-white disabled:opacity-50 disabled:cursor-not-allowed" 
                        disabled={!shareCurrentImageUrl}
                        onClick={() => {
                          setIsShareModalOpen(true);
                        }}
                      >
                        {shareCurrentImageUrl ? (
                          <><Share2 size={18} className="mr-2" /> Share to WhatsApp</>
                        ) : (
                          <><Sparkles size={18} className="mr-2 animate-pulse" /> Uploading...</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
                
                {generatedText && (
                  <div className="mt-4 p-5 bg-surface border border-border rounded-xl">
                    <h4 className="font-bold text-textPrimary mb-3 flex items-center gap-2"><Sparkles size={16} className="text-primary" /> AI Design Concept:</h4>
                    <div className="text-textSecondary text-sm leading-relaxed overflow-hidden">
                      <ReactMarkdown
                        components={{
                          h1: ({node, ...props}) => <h1 className="text-lg font-bold mb-2 text-textPrimary" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-md font-bold mt-4 mb-2 text-textPrimary" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-sm font-bold mt-3 mb-1 text-textPrimary" {...props} />,
                          p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
                          li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-semibold text-textPrimary" {...props} />,
                        }}
                      >
                        {generatedText}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Product Picker Modal */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface w-full max-w-2xl rounded-2xl shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <h3 className="font-bold text-lg">Select Products ({selectedProducts.length}/5)</h3>
              <button onClick={() => setIsPickerOpen(false)} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {shopProducts.length === 0 ? (
                <div className="text-center text-textSecondary py-8">No products found in your inventory.</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {shopProducts.map(p => {
                    const isSelected = selectedProducts.some(sp => sp.id === p.id);
                    return (
                      <div 
                        key={p.id} 
                        onClick={() => {
                          if (isSelected) {
                            setSelectedProducts(prev => prev.filter(sp => sp.id !== p.id));
                          } else if (selectedProducts.length < 5) {
                            setSelectedProducts(prev => [...prev, p]);
                          }
                        }}
                        className={`cursor-pointer rounded-xl border-2 overflow-hidden transition-all relative ${isSelected ? 'border-primary shadow-sm ring-2 ring-primary/20' : 'border-border hover:border-gray-300'}`}
                      >
                        <div className="aspect-square bg-gray-100">
                          {p.image_url ? (
                             <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                             <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Image</div>
                          )}
                        </div>
                        <div className="p-2 bg-surface text-xs font-medium truncate" title={p.name}>{p.name}</div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-primary text-background rounded-full p-1 shadow-md">
                            <Check size={14} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-border flex justify-end bg-surface rounded-b-2xl shrink-0">
              <Button onClick={() => setIsPickerOpen(false)}>Done</Button>
            </div>
          </div>
        </div>
      )}

      {/* History Slide-out Sidebar */}
      <div 
        className={`fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isHistoryOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setIsHistoryOpen(false)}
      />
      <div 
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-surface shadow-2xl z-[201] flex flex-col transition-transform duration-300 transform ${isHistoryOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-textPrimary flex items-center gap-2"><Clock size={18} /> Chat History</h2>
          <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-sand rounded-xl"><X size={20} className="text-textSecondary" /></button>
        </div>
        <div className="p-4 border-b border-border">
          <Button onClick={startNewChat} className="w-full flex items-center justify-center gap-2 py-3">
            <PlusIcon size={18} /> New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {chatSessions.length === 0 ? (
            <p className="text-center text-sm text-textSecondary py-8">No previous chats found.</p>
          ) : (
            chatSessions.map((session) => (
              <div 
                key={session.id}
                onClick={() => loadSession(session)}
                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-colors ${
                  currentSessionId === session.id 
                    ? 'bg-primary/5 border-primary/30 text-primary' 
                    : 'bg-background border-border hover:border-primary/50 text-textPrimary'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare size={16} className={currentSessionId === session.id ? 'text-primary' : 'text-textSecondary'} />
                  <div className="truncate">
                    <p className="text-sm font-semibold truncate">{session.title}</p>
                    <p className="text-[10px] text-textSecondary">{new Date(session.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <button 
                  onClick={(e) => deleteSession(e, session.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-textSecondary hover:text-error hover:bg-error/10 rounded-lg transition-all"
                  aria-label="Delete chat"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Image History Slide-out Sidebar */}
      <div 
        className={`fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isImageHistoryOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setIsImageHistoryOpen(false)}
      />
      <div 
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-surface shadow-2xl z-[201] flex flex-col transition-transform duration-300 transform ${isImageHistoryOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h2 className="text-lg font-bold text-textPrimary flex items-center gap-2"><History size={18} /> Generated Images</h2>
          <button onClick={() => setIsImageHistoryOpen(false)} className="p-2 hover:bg-sand rounded-xl"><X size={20} className="text-textSecondary" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {generatedImagesHistory.length === 0 ? (
            <p className="text-center text-sm text-textSecondary py-8">No previously generated images found.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {generatedImagesHistory.map((img) => (
                <div key={img.id} className="relative group rounded-xl overflow-hidden border border-border shadow-sm">
                  <img src={img.generated_image_url} alt={img.prompt || 'Generated image'} className="w-full aspect-square object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <p className="text-xs text-white line-clamp-3 mb-2">{img.prompt}</p>
                    <div className="flex gap-2">
                      <button onClick={() => {
                         setShareCurrentImageUrl(img.generated_image_url);
                         setIsShareModalOpen(true);
                      }} className="flex-1 bg-[#25D366] text-white py-1.5 rounded-lg text-xs font-bold flex items-center justify-center hover:bg-[#128C7E]">
                        <Share2 size={12} className="mr-1"/> Share
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Share to WhatsApp Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface w-full max-w-md rounded-2xl shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border bg-gray-50 shrink-0">
              <h3 className="font-bold text-lg flex items-center gap-2 text-textPrimary"><Phone size={18} className="text-[#25D366]" /> Share via WhatsApp</h3>
              <button onClick={() => setIsShareModalOpen(false)} className="text-gray-500 hover:bg-gray-200 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 border-b border-border shrink-0">
               <input
                 type="text"
                 placeholder="Search customers..."
                 value={shareCustomerSearch}
                 onChange={e => setShareCustomerSearch(e.target.value)}
                 className="w-full bg-sand border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50"
               />
            </div>

            <div className="flex-1 overflow-y-auto p-2 max-h-[40vh]">
              {shopCustomers.filter(c => c.name.toLowerCase().includes(shareCustomerSearch.toLowerCase()) || (c.phone && c.phone.includes(shareCustomerSearch))).length === 0 ? (
                 <div className="p-4 text-center text-sm text-textSecondary">No customers found.</div>
              ) : (
                 shopCustomers
                   .filter(c => c.name.toLowerCase().includes(shareCustomerSearch.toLowerCase()) || (c.phone && c.phone.includes(shareCustomerSearch)))
                   .map(c => (
                     <button
                       key={c.id}
                       className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-sand transition-colors text-left"
                       onClick={() => {
                         if (!shareCurrentImageUrl) {
                            alert("Image is still being uploaded to the server. Please try sharing again in a few seconds.");
                            return;
                         }
                         const text = `Hi ${c.name}, I wanted to share this new design concept we created for you! Check it out here: ${shareCurrentImageUrl}`;
                         const waUrl = `https://wa.me/${c.phone?.replace(/[^0-9]/g, '') || ''}?text=${encodeURIComponent(text)}`;
                         window.open(waUrl, '_blank');
                         setIsShareModalOpen(false);
                       }}
                     >
                       <div>
                         <p className="font-bold text-sm text-textPrimary">{c.name}</p>
                         <p className="text-xs text-textSecondary mt-0.5">{c.phone || 'No phone'}</p>
                       </div>
                       <Share2 size={16} className="text-textSecondary" />
                     </button>
                   ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AI;
