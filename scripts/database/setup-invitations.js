
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
    
    // Check if table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from('user_invitations')
      .select('id')
      .limit(1);
    
    if (!checkError || checkError.code === 'PGRST116') {
      console.log('✅ User invitations table already exists');
      return true;
    }
    
    // Create the table using Supabase SQL editor approach
    console.log('Creating user_invitations table...');
    
    // Since we can't use exec_sql, we'll need to create this manually
    // For now, let's check if we can create it using direct table operations
    try {
      // Try to insert a test record to see if table exists
      const { error: insertError } = await supabase
        .from('user_invitations')
        .insert({
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          role: 'customer',
          invitation_token: 'test_token_' + Date.now(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
      
      if (!insertError) {
        // Clean up test record
        await supabase
          .from('user_invitations')
          .delete()
          .eq('email', 'test@example.com');
        
        console.log('✅ User invitations table is working');
        return true;
      }
    } catch (testError) {
      console.log('Table does not exist, needs to be created manually in Supabase dashboard');
    }
    
    console.log('⚠️  Please create the user_invitations table manually in Supabase:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the SQL from create-invitations-table.sql');
    
    return false;
    
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
