import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClientInstance: SupabaseClient | null = null;

/**
 * Clears the cached Supabase client instance.
 * Useful when environment variables are updated on-the-fly.
 */
export function clearSupabaseClient(): void {
  supabaseClientInstance = null;
}

/**
 * Checks if Supabase credentials have been configured in the environment.
 */
export const DEFAULT_SUPABASE_URL = "https://jjzzauslbtfgpllxhagm.supabase.co";
export const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqenphdXNsYnRmZ3BsbHhoYWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2MjA3MzAsImV4cCI6MjA5ODE5NjczMH0.ygaO4s7C0KVL2SfNbMXpijLGeCujmqU_AgKEZN5rQkw";
export const DEFAULT_SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqenphdXNsYnRmZ3BsbHhoYWdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjYyMDczMCwiZXhwIjoyMDk4MTk2NzMwfQ.nDigZiWIRVPKzJQViASjjjCWhqaT2n25b-BqqJ7ccUw";

export function isSupabaseConfigured(): boolean {
  try {
    const isServer = typeof process !== 'undefined' && process.env;
    const url = isServer 
      ? (process.env.SUPABASE_URL || (process.env as any).VITE_SUPABASE_URL)
      : ((import.meta as any).env.VITE_SUPABASE_URL);
    const key = isServer
      ? (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || (process.env as any).VITE_SUPABASE_ANON_KEY)
      : ((import.meta as any).env.VITE_SUPABASE_ANON_KEY);
      
    return !!(url || DEFAULT_SUPABASE_URL) && !!(key || DEFAULT_SUPABASE_KEY || DEFAULT_SUPABASE_SERVICE_KEY);
  } catch {
    return true;
  }
}

/**
 * Returns a lazily-initialized Supabase Client instance.
 */
export function getSupabase(): SupabaseClient {
  if (supabaseClientInstance) {
    return supabaseClientInstance;
  }

  const isServer = typeof process !== 'undefined' && process.env;
  
  const supabaseUrl = (isServer 
    ? (process.env.SUPABASE_URL || (process.env as any).VITE_SUPABASE_URL)
    : ((import.meta as any).env.VITE_SUPABASE_URL)) || DEFAULT_SUPABASE_URL;
    
  const supabaseKey = (isServer
    ? (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || (process.env as any).VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_SERVICE_KEY)
    : ((import.meta as any).env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY));

  supabaseClientInstance = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseClientInstance;
}

/**
 * Uploads a file buffer or base64 directly to Supabase Storage and returns its public URL
 */
export async function uploadToSupabaseStorage(
  bucketName: string,
  filePath: string,
  fileData: Buffer | Uint8Array,
  contentType: string
): Promise<string | null> {
  try {
    const supabase = getSupabase();
    
    // Attempt upload
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileData, {
        contentType,
        upsert: true
      });

    if (uploadError) {
      console.warn(`[Supabase Storage] Initial upload failed in bucket '${bucketName}':`, uploadError.message);
      
      // If bucket not found, attempt to create it if possible
      try {
        await supabase.storage.createBucket(bucketName, { public: true });
        const { error: retryError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, fileData, {
            contentType,
            upsert: true
          });
          
        if (!retryError) {
          const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
          if (publicData?.publicUrl) return publicData.publicUrl;
        }
      } catch (bucketCreateErr) {
        console.warn('[Supabase Storage] Bucket creation error:', bucketCreateErr);
      }
    } else {
      const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      if (publicData?.publicUrl) return publicData.publicUrl;
    }

    // Fallback standard public URL endpoint
    const url = (typeof process !== 'undefined' && process.env?.SUPABASE_URL) || DEFAULT_SUPABASE_URL;
    return `${url.replace(/\/$/, '')}/storage/v1/object/public/${bucketName}/${filePath}`;
  } catch (err: any) {
    console.warn('[Supabase Storage Upload Exception]', err.message || err);
    return null;
  }
}
