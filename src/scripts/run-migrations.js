const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const buildMongoUri = () => {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  if (process.env.DB_URI) return process.env.DB_URI;
  const username = process.env.DB_USERNAME;
  const password = process.env.DB_PASS;
  const dbName = process.env.DB_NAME;
  return `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@cluster0.c60ctk1.mongodb.net/${encodeURIComponent(dbName)}?retryWrites=true&w=majority&appName=Cluster0`;
};

const migrationSchema = new mongoose.Schema({
  filename: { type: String, required: true, unique: true },
  executedAt: { type: Date, default: Date.now }
}, { collection: 'MIGRATIONS_HISTORY' });

const Migration = mongoose.model('Migration', migrationSchema);

async function run() {
  console.log('Connecting to database...');
  await mongoose.connect(buildMongoUri());
  console.log('Connected to DB:', mongoose.connection.name);

  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found. Skipping.');
    process.exit(0);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.js') && f !== 'run-migrations.js')
    .sort(); // Run sequentially

  console.log(`Found ${files.length} migration files. Checking status...`);

  for (const file of files) {
    const executed = await Migration.findOne({ filename: file });
    
    if (executed) {
      console.log(`[SKIP] Migration already executed: ${file}`);
      continue;
    }

    console.log(`[RUN] Executing migration: ${file}...`);
    try {
      const migrationPath = path.join(migrationsDir, file);
      // Execute the migration dynamically by requiring it. 
      // The script should export a run(mongoose, db) function.
      const migration = require(migrationPath);
      
      if (typeof migration.run === 'function') {
        await migration.run(mongoose, mongoose.connection.db);
      } else {
        // Legacy support if it's a standalone script like our first one
        console.warn(`[WARN] Migration ${file} does not export a 'run' function. Make sure future scripts export 'run' function!`);
      }

      await Migration.create({ filename: file });
      console.log(`[DONE] Finished migration: ${file}`);
    } catch (err) {
      console.error(`[ERROR] Migration failed: ${file}`, err);
      process.exit(1);
    }
  }

  console.log('All migrations executed successfully!');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Migration Runner Failed:', err);
  process.exit(1);
});
