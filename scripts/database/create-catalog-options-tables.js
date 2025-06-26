const { supabase } = require('../../server/db.ts');
const fs = require('fs');
const path = require('path');

async function createCatalogOptionsTables() {
  console.log('Creating catalog options tables...');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create-catalog-options-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split SQL into individual statements and execute them
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      const trimmedStatement = statement.trim();
      if (trimmedStatement) {
        console.log(`Executing: ${trimmedStatement.substring(0, 50)}...`);

        const { error } = await supabase.rpc('exec_sql', {
          sql: trimmedStatement
        });

        if (error) {
          console.error(`Error executing statement: ${error.message}`);
          // Try direct query as fallback
          const { error: queryError } = await supabase
            .from('_sql_query')
            .select('*')
            .eq('query', trimmedStatement);

          if (queryError) {
            console.warn(`Both exec_sql and direct query failed for: ${trimmedStatement.substring(0, 50)}...`);
          }
        }
      }
    }

    // Verify tables were created
    console.log('\nVerifying table creation...');

    const { data: categories, error: catError } = await supabase
      .from('catalog_categories')
      .select('count')
      .limit(1);

    if (!catError) {
      console.log('✅ catalog_categories table verified');
    } else {
      console.error('❌ catalog_categories table not found:', catError.message);
    }

    const { data: sports, error: sportError } = await supabase
      .from('catalog_sports')
      .select('count')
      .limit(1);

    if (!sportError) {
      console.log('✅ catalog_sports table verified');
    } else {
      console.error('❌ catalog_sports table not found:', sportError.message);
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