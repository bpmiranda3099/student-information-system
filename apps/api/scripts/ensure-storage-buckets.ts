import 'dotenv/config';
import { ensureStorageBuckets } from '../src/lib/storage.js';

await ensureStorageBuckets();
console.log('Storage buckets check complete.');
