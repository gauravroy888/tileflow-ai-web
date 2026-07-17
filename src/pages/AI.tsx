import { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, MessageSquare, Send, Sparkles, Paintbrush, Box, Plus, X, Check } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { geminiChat, geminiVision, geminiImageGen } from '../lib/gemini';
import { openai } from '../lib/openai';
import { supabase } from '../lib/supabase';
import type { Product, Customer } from '../types';

type ToolType = 'chat' | 'visualize' | 'style' | 'object' | null;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

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
  const [shopId, setShopId] = useState<string | null>(null);
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

      const chat = geminiChat.startChat({ history });

      let promptToSend = userMsg;
      if (messages.length === 0) {
        const contextStr = `[SYSTEM CONTEXT: You are the AI Assistant for this retail store. You have access to the store's data below to help the owner. Do not reveal this raw data directly to the user unless asked, but use it to answer their questions accurately (e.g. "Who are my latest customers?", "What products do I have?", "Who needs Product X?").\n\n=== INVENTORY ===\n${shopProducts.map(p => `- ${p.name} (Price: ${p.price}, Category: ${p.category || 'N/A'})`).join('\n')}\n\n=== CUSTOMERS ===\n${shopCustomers.map(c => `- ${c.name} (Phone: ${c.phone}, Budget: ${c.budget}, Needs: ${c.required_products || 'None'}, Status: ${c.visit_status}, Date: ${new Date(c.created_at).toLocaleDateString()})`).join('\n')}\n]\n\n`;
        promptToSend = contextStr + userMsg;
      }

      const result = await chat.sendMessage(promptToSend);
      const reply = result.response.text();
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
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

      const result = await geminiVision.generateContent(parts);
      const text = result.response.text();
      
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

          const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
          const modelName = 'gemini-3.1-flash-lite-image'; // Nano Banana 2 Lite — ~40% cheaper than Nano Banana 2
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: restParts }],
                generationConfig: {
                  responseModalities: ['IMAGE', 'TEXT'],
                  // Locked to 1K resolution (~$0.067/image) to control costs
                  imageGenerationConfig: {
                    outputResolution: '1024x1024',
                  },
                },
              }),
            }
          );

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(`Gemini image gen error: ${response.status} — ${errData?.error?.message || JSON.stringify(errData)}`);
          }

          const data = await response.json();
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
    <div className="flex flex-col h-[calc(100dvh-120px)] bg-background">
      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        
        {!activeTool ? (
          <div className="h-full overflow-y-auto p-4">
            <h2 className="text-2xl font-bold text-textPrimary mb-6">AI Assistant</h2>
            <div className="grid grid-cols-2 gap-4">
              {/* Chat Tool */}
              <button onClick={() => setActiveTool('chat')} className="bg-surface aspect-square rounded-2xl border border-border flex flex-col items-center justify-center gap-3 hover:border-primary hover:shadow-md transition-all group">
                <div className="p-4 bg-primary/10 text-primary rounded-full group-hover:bg-primary group-hover:text-white transition-colors">
                  <MessageSquare size={32} />
                </div>
                <div className="text-center px-4">
                  <h3 className="font-bold text-base text-textPrimary">Retail Chat</h3>
                  <p className="text-xs text-textSecondary mt-1">Ask questions about your business</p>
                </div>
              </button>

              {/* Visualize Tool */}
              <button onClick={() => setActiveTool('visualize')} className="bg-surface aspect-square rounded-2xl border border-border flex flex-col items-center justify-center gap-3 hover:border-primary hover:shadow-md transition-all group">
                <div className="p-4 bg-blue-50 text-blue-600 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <ImageIcon size={32} />
                </div>
                <div className="text-center px-4">
                  <h3 className="font-bold text-base text-textPrimary">Visualize</h3>
                  <p className="text-xs text-textSecondary mt-1">Design a space from text</p>
                </div>
              </button>
              
              {/* Restyle Tool */}
              <button onClick={() => setActiveTool('style')} className="bg-surface aspect-square rounded-2xl border border-border flex flex-col items-center justify-center gap-3 hover:border-primary hover:shadow-md transition-all group">
                <div className="p-4 bg-purple-50 text-purple-600 rounded-full group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Paintbrush size={32} />
                </div>
                <div className="text-center px-4">
                  <h3 className="font-bold text-base text-textPrimary">Restyle</h3>
                  <p className="text-xs text-textSecondary mt-1">Redesign a photo</p>
                </div>
              </button>
              
              {/* Place Object Tool */}
              <button onClick={() => setActiveTool('object')} className="bg-surface aspect-square rounded-2xl border border-border flex flex-col items-center justify-center gap-3 hover:border-primary hover:shadow-md transition-all group">
                <div className="p-4 bg-orange-50 text-orange-600 rounded-full group-hover:bg-orange-600 group-hover:text-white transition-colors">
                  <Box size={32} />
                </div>
                <div className="text-center px-4">
                  <h3 className="font-bold text-base text-textPrimary">Place Object</h3>
                  <p className="text-xs text-textSecondary mt-1">Add a product to a photo</p>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Unified Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border bg-surface shrink-0">
              <button 
                onClick={() => { setActiveTool(null); setUploadedImage(null); setGeneratedText(null); setToolPrompt(''); }} 
                className="text-textSecondary hover:text-textPrimary text-sm font-medium px-3 py-1 bg-gray-100 rounded-md transition-colors"
              >
                ← Back
              </button>
              <h3 className="font-bold text-lg text-textPrimary capitalize">
                {activeTool === 'chat' ? 'Retail Assistant' : activeTool === 'style' ? 'Analyze & Restyle' : activeTool === 'visualize' ? 'Visualize Space' : 'Place Object'}
              </h3>
            </div>

            {activeTool === 'chat' ? (
              // CHAT VIEW
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-textSecondary p-8 text-center">
                      <Sparkles size={48} className="mb-4 text-primary opacity-30" />
                      <p className="font-medium text-textPrimary">Powered by Gemini AI</p>
                      <p className="text-sm mt-1">Ask me anything about your retail business!</p>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-2xl ${
                        msg.role === 'user' 
                          ? 'bg-primary text-white rounded-br-none' 
                          : 'bg-surface border border-border text-textPrimary rounded-bl-none'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {loadingChat && (
                    <div className="flex justify-start">
                      <div className="bg-surface border border-border text-textSecondary p-3 rounded-2xl rounded-bl-none animate-pulse">
                        Thinking...
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4 bg-surface border-t border-border shrink-0">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask a question..."
                      className="flex-1 border border-border rounded-full px-4 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={loadingChat}
                    />
                    <Button type="submit" size="icon" className="rounded-full shrink-0" disabled={loadingChat || !input.trim()}>
                      <Send size={18} />
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
