
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setupInvitationsTable() {
  try {
    console.log('Setting up user invitations table...');
    
    // Read and execute the SQL file
    const sqlPath = path.join(__dirname, 'create-invitations-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Error creating invitations table:', error);
      return false;
    }
    
    console.log('✅ User invitations table created successfully');
    return true;
    
  } catch (error) {
    console.error('Error setting up invitations table:', error);
    return false;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupInvitationsTable()
    .then(success => {
      process.exit(success ? 0 : 1);
    });
}

export { setupInvitationsTable };
