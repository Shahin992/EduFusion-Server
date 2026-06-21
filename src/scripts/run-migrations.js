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

  // EXPLICITLY DEFINED MIGRATIONS
  // Add new migration filenames here manually to execute them.
  const files = [
    '01_add_fee_and_code_to_classes.js',
    '02_remove_monthly_fees_from_students.js',
    '03_add_groups_to_classes_and_subjects.js',
    '04_add_group_to_students.js',
    '05_create_default_plans.js',
    '06_create_superadmin.js',
    '07_rename_billing_collections_to_uppercase.js'
  ];

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
  
  // --- Update MIGRATION_TRACK.md ---
  console.log('Updating MIGRATION_TRACK.md...');
  const executedMigrations = await Migration.find({}).sort({ executedAt: 1 });
  const executedMap = new Map();
  executedMigrations.forEach(m => executedMap.set(m.filename, m.executedAt));

  let mdContent = `# EduFusion Migration Tracker\n\n`;
  mdContent += `*Last Updated: ${new Date().toLocaleString()}*\n\n`;
  mdContent += `| Migration File | Status | Executed At |\n`;
  mdContent += `|----------------|--------|-------------|\n`;

  let pendingCount = 0;
  let doneCount = 0;

  for (const file of files) {
    if (executedMap.has(file)) {
      mdContent += `| \`${file}\` | ✅ Done | ${executedMap.get(file).toLocaleString()} |\n`;
      doneCount++;
    } else {
      mdContent += `| \`${file}\` | ⏳ Pending | - |\n`;
      pendingCount++;
    }
  }

  for (const [file, date] of executedMap.entries()) {
    if (!files.includes(file)) {
      mdContent += `| \`${file}\` | ⚠️ Missing File | ${date.toLocaleString()} |\n`;
    }
  }

  mdContent += `\n### Summary\n- **Total Migrations:** ${files.length}\n- **Executed:** ${doneCount}\n- **Pending:** ${pendingCount}\n`;

  const outPath = path.join(__dirname, 'MIGRATION_TRACK.md');
  fs.writeFileSync(outPath, mdContent);
  console.log(`✅ Migration track saved successfully to: MIGRATION_TRACK.md`);
  // ---------------------------------

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Migration Runner Failed:', err);
  process.exit(1);
});
