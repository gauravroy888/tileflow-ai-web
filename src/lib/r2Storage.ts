import { supabase } from './supabase';

export const uploadToR2 = async (file: File | Blob, fileName: string): Promise<string> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Authentication required');

    // 1. Get Presigned URL from our Edge Function
    const { data, error } = await supabase.functions.invoke('r2-presign', {
      body: { 
        filename: fileName, 
        contentType: file.type || 'application/octet-stream' 
      },
    });

    if (error) {
      console.error("r2-presign error", error);
      throw error;
    }

    const { signedUrl, publicUrl } = data;

    // 2. Upload file directly to Cloudflare R2
    const uploadResponse = await fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload to R2: ${uploadResponse.statusText}`);
    }

    // 3. Return the final public URL
    return publicUrl;
  } catch (err) {
    console.error('Upload to R2 failed:', err);
    throw err;
  }
};
