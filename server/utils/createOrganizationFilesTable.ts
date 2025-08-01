import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function createOrganizationFilesTable() {
  try {
    console.log('🔄 Creating organization_files table...');
    
    const sqlPath = path.resolve('create-organization-files-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Error creating organization_files table:', error);
      return false;
    }
    
    console.log('✅ Organization_files table created successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to create organization_files table:', error);
    return false;
  }
}