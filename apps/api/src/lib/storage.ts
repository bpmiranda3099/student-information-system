import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AVATARS_BUCKET } from '@sis/shared';

let supabase: SupabaseClient | null = null;

const REQUIRED_BUCKETS = [
  { name: AVATARS_BUCKET, public: false, fileSizeLimit: 2 * 1024 * 1024 },
  { name: 'lesson-pdfs', public: false, fileSizeLimit: 10 * 1024 * 1024 },
] as const;

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Supabase credentials not configured');
    }
    supabase = createClient(url, key);
  }
  return supabase;
}

export async function uploadFile(
  bucket: string,
  path: string,
  file: Buffer,
  contentType: string,
): Promise<string> {
  const client = getSupabase();
  const { error } = await client.storage.from(bucket).upload(path, file, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return path;
}

export async function downloadFile(bucket: string, path: string): Promise<Buffer> {
  const client = getSupabase();
  const { data, error } = await client.storage.from(bucket).download(path);
  if (error) throw new Error(`Storage download failed: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}

export async function getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string> {
  const client = getSupabase();
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw new Error(`Signed URL failed: ${error.message}`);
  return data.signedUrl;
}

export async function checkStorageHealth(): Promise<{ status: string }> {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { status: 'not_configured' };
    }
    const client = getSupabase();
    const { data: buckets, error } = await client.storage.listBuckets();
    if (error) return { status: 'error' };
    const names = new Set(buckets?.map((b) => b.name) ?? []);
    const missing = REQUIRED_BUCKETS.filter((b) => !names.has(b.name)).map((b) => b.name);
    if (missing.length) {
      return { status: `missing_buckets:${missing.join(',')}` };
    }
    return { status: 'ok' };
  } catch {
    return { status: 'error' };
  }
}

/** Create profile/lesson storage buckets if missing (uses service role). */
export async function ensureStorageBuckets(): Promise<void> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }
  try {
    const client = getSupabase();
    const { data: buckets, error: listError } = await client.storage.listBuckets();
    if (listError) {
      console.warn('[storage] listBuckets:', listError.message);
      return;
    }
    const existing = new Set(buckets?.map((b) => b.name) ?? []);

    for (const bucket of REQUIRED_BUCKETS) {
      if (existing.has(bucket.name)) continue;
      const { error } = await client.storage.createBucket(bucket.name, {
        public: bucket.public,
        fileSizeLimit: bucket.fileSizeLimit,
      });
      if (error) {
        console.warn(`[storage] createBucket ${bucket.name}:`, error.message);
      } else {
        console.log(`[storage] Created bucket "${bucket.name}"`);
      }
    }
  } catch (err) {
    console.warn('[storage] ensureStorageBuckets:', err);
  }
}

export const STORAGE_BUCKET = 'lesson-pdfs';
