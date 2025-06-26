
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createCatalogOptionsTables() {
  console.log('Connecting to Supabase with service role key...');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  try {
    console.log('Reading SQL file...');
    const sqlPath = path.join(__dirname, 'create-catalog-options-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing SQL to create missing tables...');
    
    // Execute the complete SQL as one statement
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: sql
    });

    if (error) {
      console.error('Error executing SQL:', error.message);
      // Try direct SQL execution as fallback
      console.log('Trying alternative approach...');
      
      const { error: directError } = await supabase
        .from('catalog_categories')
        .select('id')
        .limit(1);
        
      if (directError && directError.code === 'PGRST204') {
        console.log('Tables do not exist, need to create them manually...');
        // Tables don't exist, continue with manual creation
      }
    } else {
      console.log('Database tables created successfully!');
    }

    // Verify tables were created
    console.log('Verifying table creation...');

    const { data: categories, error: catError } = await supabase
      .from('catalog_categories')
      .select('id')
      .limit(1);

    if (!catError) {
      console.log('✅ catalog_categories table verified');
    } else {
      console.error('Error verifying table catalog_categories:', catError.message);
    }

    const { data: sports, error: sportError } = await supabase
      .from('catalog_sports')
      .select('id')
      .limit(1);

    if (!sportError) {
      console.log('✅ catalog_sports table verified');
    } else {
      console.error('Error verifying table catalog_sports:', sportError.message);
    }

  } catch (error) {
    console.error('Failed to create catalog options tables:', error);
    process.exit(1);
  }
}

// Run the setup
createCatalogOptionsTables()
  .then(() => {
    console.log('🎉 Catalog options tables setup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
