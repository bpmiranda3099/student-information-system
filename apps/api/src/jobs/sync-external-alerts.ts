import 'dotenv/config';
import { syncAllExternalAlerts } from '../services/alerts/index.js';
import { prisma } from '../lib/prisma.js';

async function main() {
  console.log('Starting external alert sync…');
  const results = await syncAllExternalAlerts();
  console.log('Sync results:', results);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
