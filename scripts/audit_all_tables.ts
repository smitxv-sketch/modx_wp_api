import { pool, getPrefix } from '../server/db';

async function audit() {
  try {
    const prefix = getPrefix();
    
    // Get all tables
    const [tables] = await pool.query(`SHOW TABLES`);
    const tableNames = (tables as any[]).map(t => Object.values(t)[0] as string);
    
    console.log(`Found ${tableNames.length} tables. Analyzing row counts...`);
    
    const results = [];
    for (const tableName of tableNames) {
      try {
        const [rows] = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        const count = (rows as any[])[0].count;
        if (count > 0) {
          results.push({ table: tableName, count });
        }
      } catch (e) {
        // Skip tables we can't read
      }
    }
    
    // Sort by count descending
    results.sort((a, b) => b.count - a.count);
    
    console.log("\n--- TABLES WITH DATA ---");
    console.table(results);

    // Let's also check system settings for global variables (phones, emails, etc.)
    const [settings] = await pool.query(`
      SELECT \`key\`, \`value\` 
      FROM ${prefix}system_settings 
      WHERE \`key\` LIKE '%phone%' OR \`key\` LIKE '%email%' OR \`key\` LIKE '%address%' OR \`key\` LIKE '%social%' OR \`key\` LIKE '%vk%' OR \`key\` LIKE '%tg%' OR \`key\` LIKE '%whatsapp%' OR \`key\` LIKE '%contact%'
      LIMIT 20
    `);
    console.log("\n--- POTENTIAL GLOBAL SETTINGS ---");
    console.table(settings);

    // Let's check ClientConfig if it exists
    try {
        const [clientConfig] = await pool.query(`SELECT * FROM ${prefix}clientconfig_settings`);
        console.log("\n--- CLIENTCONFIG SETTINGS ---");
        console.table(clientConfig);
    } catch(e) {
        console.log("\nNo ClientConfig table found.");
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

audit();
