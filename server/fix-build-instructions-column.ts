
import { supabase } from './db.js';

async function addBuildInstructionsColumn() {
  console.log('🔧 Adding build_instructions column to catalog_items table...');

  try {
    // First, let's check if the column already exists
    const { data: columns, error: checkError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'catalog_items')
      .eq('column_name', 'build_instructions');

    if (checkError) {
      console.error('Error checking for existing column:', checkError);
    }

    if (columns && columns.length > 0) {
      console.log('✅ build_instructions column already exists');
      return;
    }

    // Add the column using SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE catalog_items 
        ADD COLUMN IF NOT EXISTS build_instructions TEXT;
      `
    });

    if (error) {
      console.error('💥 Error adding build_instructions column:', error);
      
      // Try alternative method - direct SQL execution
      const { error: altError } = await supabase
        .from('catalog_items')
        .select('build_instructions')
        .limit(1);

      if (altError && altError.code === 'PGRST204') {
        console.log('🔧 Column definitely missing, trying direct database connection...');
        
        // Use raw SQL query
        const { error: rawError } = await supabase.rpc('exec_sql', {
          sql: `
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'catalog_items' 
                AND column_name = 'build_instructions'
              ) THEN
                ALTER TABLE catalog_items ADD COLUMN build_instructions TEXT;
                RAISE NOTICE 'Column build_instructions added successfully';
              ELSE
                RAISE NOTICE 'Column build_instructions already exists';
              END IF;
            END $$;
          `
        });

        if (rawError) {
          console.error('💥 Raw SQL execution failed:', rawError);
          return;
        }
      }
    }

    console.log('✅ Successfully added build_instructions column');

    // Verify the column was added
    const { data: testData, error: testError } = await supabase
      .from('catalog_items')
      .select('id, name, build_instructions')
      .limit(1);

    if (testError) {
      console.error('💥 Verification failed:', testError);
    } else {
      console.log('✅ Column verified - catalog_items table can now be queried with build_instructions');
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addBuildInstructionsColumn()
    .then(() => {
      console.log('🎉 Database migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database migration failed:', error);
      process.exit(1);
    });
}

export default addBuildInstructionsColumn;
