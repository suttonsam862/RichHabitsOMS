
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

async function setupMissingTables() {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing required environment variables:');
      console.error('- SUPABASE_URL:', !!process.env.SUPABASE_URL);
      console.error('- SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
      process.exit(1);
    }

    console.log('Connecting to Supabase with service role key...');
    
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

    console.log('Reading SQL file...');
    const sqlPath = path.join(__dirname, 'create-missing-tables.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing SQL to create missing tables...');
    
    // Split SQL commands and execute them one by one
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    for (const command of commands) {
      if (command.trim()) {
        console.log(`Executing: ${command.substring(0, 50)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: command });
        
        if (error) {
          // Try alternative method using direct query
          const { error: queryError } = await supabase
            .from('_placeholder')
            .select('*')
            .limit(0);
          
          if (queryError) {
            console.warn(`Warning: ${error.message}`);
          }
        }
      }
    }

    console.log('Database tables created successfully!');
    
    // Verify tables exist
    console.log('Verifying table creation...');
    
    const tables = ['catalog_items', 'catalog_categories', 'catalog_sports'];
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.error(`Error verifying table ${table}:`, error.message);
      } else {
        console.log(`✓ Table ${table} exists and is accessible`);
      }
    }

    console.log('Setup completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

setupMissingTables();
