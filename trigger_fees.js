const { Queue } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis({ host: 'localhost', port: 6380 });
const feesQueue = new Queue('fees', { connection });

async function trigger() {
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  await feesQueue.add('generate-monthly-fees', { currentMonth }, {
    attempts: 1
  });
  console.log(`Triggered generate-monthly-fees for ${currentMonth}`);
  process.exit(0);
}
trigger();
