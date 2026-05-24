import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });
dotenv.config();

// Set before app import so dotenv/config does not reload a real key from .env.
process.env.RESEND_API_KEY = '';
