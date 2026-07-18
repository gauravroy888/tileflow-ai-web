import { useState, useRef, useEffect } from 'react';
import { ArrowRight, Box, Camera, Check, ClipboardList, Image as ImageIcon, MessageSquare, PackageSearch, Paintbrush, Plus, Send, Sparkles, TrendingUp, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import type { Product, Customer } from '../types';

type ToolType = 'chat' | 'visualize' | 'style' | 'object' | null;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const chatSuggestions = [
  { label: 'Showroom follow-ups', prompt: 'Which customers should I follow up with today?', icon: ClipboardList, tone: 'bg-[#EEF5FC] text-[#315B91]' },
  { label: 'Check my stock', prompt: 'What products do I currently have in my catalogue?', icon: PackageSearch, tone: 'bg-[#F8F0E6] text-[#AD681C]' },
  { label: 'Sales idea', prompt: 'Suggest a simple way to improve sales this week.', icon: TrendingUp, tone: 'bg-[#F2EBF9] text-[#7D3FB5]' },
];

const AI = () => {
  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);

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

  // Inventory Attachment State
  const [, setShopId] = useState<string | null>(null);
  const [shopProducts, setShopProducts] = useState<Product[]>([]);
  const [shopCustomers, setShopCustomers] = useState<Customer[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

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
      }
    };
    fetchShopAndProducts();
  }, []);

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

      const { data, error } = await supabase.functions.invoke('gemini-proxy', {
        body: { 
          action: 'chat',
          prompt: promptToSend, 
          history,
          systemInstruction: "You are a helpful AI assistant for retail store owners..."
        }
      });

      if (error) throw error;
      setMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
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

    try {
      let prompt = '';
      const parts: any[] = [];
      const imageParts: any[] = [];

      if (activeTool === 'visualize') {
        prompt = `You are an expert interior designer. The user wants to visualize a retail space. Based on this description, provide a very detailed, vivid written description of what this space looks like — as if you are describing the final result of the design to a client. Include colors, materials, lighting, layout, and atmosphere. Description: "${toolPrompt}"`;
      } else if (activeTool === 'style' && uploadedImage) {
        const base64Data = uploadedImage.split(',')[1];
        prompt = `You are an expert interior designer. The user has uploaded a photo of a space and wants to change its style. Analyze the current space and then describe in vivid detail what it would look like after applying this style change: "${toolPrompt}". Be specific about colors, materials, textures, and atmosphere.`;
        imageParts.push({ inlineData: { mimeType: uploadedImageMime, data: base64Data } });
      } else if (activeTool === 'object' && uploadedImage) {
        const base64Data = uploadedImage.split(',')[1];
        prompt = `You are an expert interior designer. The user has uploaded a photo of a space and wants to place an object in it. Analyze the current space carefully and describe in vivid detail what it would look like with this addition: "${toolPrompt}". Mention exactly where the object would go, how it fits with the existing decor, and what impact it has on the overall look.`;
        imageParts.push({ inlineData: { mimeType: uploadedImageMime, data: base64Data } });
      }

      if (selectedProducts.length > 0) {
        prompt += `\n\nAdditionally, I have attached images of ${selectedProducts.length} product(s) from my inventory. Please creatively incorporate them into the design:\n`;
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

      prompt += `\n\nCRITICAL INSTRUCTION: At the very end of your response, you must write a highly descriptive, concise prompt for an image generation AI (like DALL-E 3) to generate a photorealistic image of this exact space incorporating the attached products. Enclose this prompt strictly within <dalle_prompt> and </dalle_prompt> tags.`;

      parts.push({ text: prompt });
      parts.push(...imageParts);

      const { data: visionData, error: visionError } = await supabase.functions.invoke('gemini-proxy', {
        body: {
          action: 'vision',
          parts: [{ text: prompt }],
          imageParts: imageParts
        }
      });
      if (visionError) throw visionError;
      
      const text = visionData.text;
      
      const dalleMatch = text.match(/<dalle_prompt>([\s\S]*?)<\/dalle_prompt>/i);
      if (dalleMatch && dalleMatch[1]) {
        const dallePrompt = dalleMatch[1].trim();
        const cleanText = text.replace(/<dalle_prompt>[\s\S]*?<\/dalle_prompt>/gi, '').trim();
        setGeneratedText(cleanText);
        
        setLoadingStatus('Generating image with Gemini Nano Banana...');
        try {
          // Build request parts for Gemini image generation REST API
          const restParts: any[] = [
            { text: `You are an expert interior designer and photo editor. ${dallePrompt} Generate a single photorealistic image showing this exact result. Make it look like a real interior design photograph. IMPORTANT: Incorporate the specific product(s) shown in the attached images into the scene.` },
            ...imageParts,
          ];

          const { data, error } = await supabase.functions.invoke('gemini-proxy', {
            body: {
              action: 'generateImage',
              parts: restParts
            }
          });

          if (error) throw error;
          let imageGenerated = false;
          for (const candidate of data.candidates || []) {
            for (const part of (candidate.content?.parts || [])) {
              if (part.inlineData) {
                const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                setGeneratedImageUrl(dataUrl);
                imageGenerated = true;
                break;
              }
            }
            if (imageGenerated) break;
          }

          if (!imageGenerated) {
            throw new Error('Gemini returned no image. Response: ' + JSON.stringify(data).substring(0, 300));
          }
        } catch (imgErr: any) {
          console.error('Gemini Image Generation Error:', imgErr);
          alert('Gemini Image Generation failed:\n\n' + (imgErr.message || 'Unknown error') + '\n\nCheck console for details.');
        }
      } else {
        setGeneratedText(text);
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

              <button onClick={() => setActiveTool('visualize')} className="group relative w-full overflow-hidden rounded-2xl bg-primary p-5 text-left text-white shadow-[0_16px_32px_rgba(13,45,77,0.18)] transition-transform hover:-translate-y-0.5">
                <div className="absolute -right-9 -top-10 h-40 w-40 rounded-full border-[18px] border-white/10" />
                <div className="absolute bottom-4 right-5 grid grid-cols-3 gap-1 opacity-35"><span className="h-6 w-6 rounded-md border border-white/50" /><span className="h-6 w-6 rounded-md border border-white/30" /><span className="h-6 w-6 rounded-md border border-white/40" /><span className="h-6 w-6 rounded-md border border-white/30" /><span className="h-6 w-6 rounded-md border border-white/50" /><span className="h-6 w-6 rounded-md border border-white/30" /></div>
                <div className="relative flex max-w-md items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/12 text-[#F5C4AA]"><ImageIcon size={21} /></div>
                  <div className="min-w-0 flex-1"><p className="text-sm font-extrabold">Visualise a customer’s space</p><p className="mt-1 text-sm leading-5 text-white/70">Start from a room idea and bring your own products into the concept.</p><span className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold text-white">Create a design <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" /></span></div>
                </div>
              </button>

              <div className="mt-5 flex items-center gap-2"><span className="h-px flex-1 bg-border" /><p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-textSecondary">Other ways to work</p><span className="h-px flex-1 bg-border" /></div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { type: 'chat' as const, icon: MessageSquare, title: 'Retail chat', description: 'Ask about customers or stock', color: 'bg-[#E7EFF8] text-[#315B91]' },
                  { type: 'style' as const, icon: Paintbrush, title: 'Restyle a room', description: 'Refresh an uploaded photo', color: 'bg-[#F3EBFA] text-[#7D3FB5]' },
                  { type: 'object' as const, icon: Box, title: 'Place a product', description: 'Try a tile in a space', color: 'bg-[#F8ECD5] text-[#B86D13]' },
                ].map((tool) => {
                  const Icon = tool.icon;
                  return <button key={tool.type} onClick={() => setActiveTool(tool.type)} className="group min-h-40 rounded-2xl border border-border bg-surface p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tool.color}`}><Icon size={19} /></div><h3 className="mt-5 text-sm font-extrabold text-textPrimary">{tool.title}</h3><p className="mt-1 text-xs leading-5 text-textSecondary">{tool.description}</p><ArrowRight size={15} className="mt-3 text-textSecondary transition-transform group-hover:translate-x-1 group-hover:text-primary" /></button>;
                })}
              </div>
              <p className="mt-5 rounded-xl border border-[#DDE7F4] bg-[#F4F8FC] px-3.5 py-3 text-xs leading-5 text-[#315B91]"><span className="font-extrabold">Tip:</span> Add product images from your catalogue for a concept that is closer to what you can actually sell.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Unified Header */}
            <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 shrink-0">
              <button 
                onClick={() => { setActiveTool(null); setUploadedImage(null); setGeneratedText(null); setToolPrompt(''); }} 
                className="rounded-xl bg-sand px-3 py-2 text-xs font-extrabold text-textSecondary transition-colors hover:bg-primary hover:text-white"
              >
                ← Back
              </button>
              <h3 className="text-base font-extrabold text-textPrimary">
                {activeTool === 'chat' ? 'Retail Assistant' : activeTool === 'style' ? 'Analyze & Restyle' : activeTool === 'visualize' ? 'Visualize Space' : 'Place Object'}
              </h3>
            </div>

            {activeTool === 'chat' ? (
              // CHAT VIEW
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto bg-background p-4">
                  {messages.length === 0 && (
                    <div className="mx-auto flex min-h-full max-w-xl flex-col justify-center py-3">
                      <section className="relative overflow-hidden rounded-3xl bg-primary px-5 py-6 text-white shadow-[0_18px_35px_rgba(13,45,77,0.18)]">
                        <div className="absolute -right-7 -top-8 h-28 w-28 rounded-full border-[14px] border-white/10" />
                        <div className="absolute bottom-3 right-7 text-white/10"><Sparkles size={62} strokeWidth={1.3} /></div>
                        <div className="relative">
                          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/12 text-[#F5C4AA]"><Sparkles size={20} /></div>
                          <p className="text-lg font-extrabold tracking-tight">Your showroom co-pilot</p>
                          <p className="mt-1 max-w-sm text-sm leading-5 text-white/75">Ask about customers, products, or the next best move for your business.</p>
                          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white/85"><span className="h-1.5 w-1.5 rounded-full bg-[#9BE4C7]" /> Ready with your store context</div>
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
                      <p className="rounded-xl border border-[#DDE7F4] bg-[#F4F8FC] px-3 py-2 text-center text-xs text-[#315B91]"><span className="font-extrabold">Retail context enabled.</span> Your catalogue and customer records inform this chat.</p>
                      {messages.map((msg, i) => (
                        <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {msg.role === 'assistant' && <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-white"><Sparkles size={15} /></span>}
                          <div className={`max-w-[80%] px-3.5 py-3 text-sm leading-6 ${
                            msg.role === 'user' 
                              ? 'rounded-2xl rounded-br-md bg-primary text-white shadow-sm' 
                              : 'rounded-2xl rounded-bl-md border border-border bg-surface text-textPrimary shadow-sm'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {loadingChat && (
                    <div className="mx-auto mt-4 flex max-w-2xl justify-start gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-white"><Sparkles size={15} /></span>
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
                {(activeTool === 'style' || activeTool === 'object') && (
                  <div>
                    <label className="block text-sm font-medium text-textPrimary mb-2">Upload Photo</label>
                    {uploadedImage ? (
                      <div className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden border border-border">
                        <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-cover" />
                        <button onClick={() => setUploadedImage(null)} className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70">
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-primary cursor-pointer transition-colors"
                      >
                        <Camera size={32} className="mb-2 text-gray-400" />
                        <p className="text-sm font-medium">Tap to upload a photo</p>
                      </div>
                    )}
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-textPrimary mb-2">Instructions</label>
                  <textarea
                    value={toolPrompt}
                    onChange={(e) => setToolPrompt(e.target.value)}
                    placeholder={
                      activeTool === 'visualize' ? "e.g. A modern minimalist tile showroom with bright lighting and marble displays..." :
                      activeTool === 'style' ? "e.g. Make it look like a luxury showroom with gold accents..." :
                      "e.g. Place large format grey marble tiles on the floor..."
                    }
                    className="w-full border border-border rounded-xl p-3 bg-surface text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-textPrimary mb-2">Attach from Inventory (Up to 5)</label>
                  <div className="flex items-center gap-3 overflow-x-auto pb-2">
                    {selectedProducts.map(p => (
                      <div key={p.id} className="relative w-20 h-20 rounded-xl bg-gray-100 shrink-0 border border-border">
                         {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover rounded-xl" />
                         ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Img</div>
                         )}
                         <button onClick={() => setSelectedProducts(prev => prev.filter(sp => sp.id !== p.id))} className="absolute -top-2 -right-2 bg-black text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-500 shadow-md">
                           <X size={14} />
                         </button>
                      </div>
                    ))}
                    {selectedProducts.length < 5 && (
                      <button onClick={() => setIsPickerOpen(true)} className="flex flex-col items-center justify-center px-4 py-2 h-20 bg-surface border-2 border-dashed border-border rounded-xl text-textSecondary font-medium hover:bg-gray-50 hover:border-primary hover:text-primary transition-colors shrink-0">
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
                  <div className="mt-6 rounded-2xl overflow-hidden border border-border shadow-md">
                    <img src={generatedImageUrl} alt="Generated Design" className="w-full h-auto object-cover" />
                  </div>
                )}
                
                {generatedText && (
                  <div className="mt-4 p-5 bg-surface border border-border rounded-xl">
                    <h4 className="font-bold text-textPrimary mb-3 flex items-center gap-2"><Sparkles size={16} className="text-primary" /> AI Design Concept:</h4>
                    <p className="text-textSecondary text-sm leading-relaxed whitespace-pre-wrap">{generatedText}</p>
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
                          <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1 shadow-md">
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

    </div>
  );
};

export default AI;
