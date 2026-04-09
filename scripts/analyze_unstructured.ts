import { pool, getPrefix } from '../server/db';

async function analyze() {
  try {
    const prefix = getPrefix();
    
    // 1. Look for custom tables
    const [tables] = await pool.query(`SHOW TABLES`);
    const tableNames = (tables as any[]).map(t => Object.values(t)[0] as string);
    const customTables = tableNames.filter(t => !t.startsWith(prefix + 'site_') && !t.startsWith(prefix + 'manager_') && !t.startsWith(prefix + 'user') && !t.startsWith(prefix + 'system_') && !t.startsWith(prefix + 'member_') && !t.startsWith(prefix + 'document_'));
    console.log("--- Custom / Interesting Tables ---");
    console.log(customTables.join(', '));

    // 2. Look at complex TVs (JSON, lists, etc.)
    const complexTvNames = ['json_data', 'photo_list', 'faq_services', 'equipment_list', 'list-of-examinations', 'pricelist', 'articles', 'articles2'];
    
    for (const tvName of complexTvNames) {
      const [tvValues] = await pool.query(`
        SELECT tvc.value, c.id as docId, c.pagetitle, c.template
        FROM ${prefix}site_tmplvar_contentvalues tvc
        JOIN ${prefix}site_tmplvars tv ON tv.id = tvc.tmplvarid
        JOIN ${prefix}site_content c ON c.id = tvc.contentid
        WHERE tv.name = ? AND tvc.value != '' AND tvc.value IS NOT NULL
        LIMIT 3
      `, [tvName]);
      
      console.log(`\n--- Sample values for TV: ${tvName} ---`);
      if ((tvValues as any[]).length === 0) {
        console.log("No data found or empty.");
      } else {
        (tvValues as any[]).forEach(v => {
          console.log(`Doc ${v.docId} (${v.pagetitle}, Tpl: ${v.template}):\n${String(v.value).substring(0, 150)}...`);
        });
      }
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

analyze();
