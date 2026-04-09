import { pool, getPrefix } from '../server/db';

async function analyze() {
  try {
    const prefix = getPrefix();
    
    // 1. MS2 Products join with site_content
    try {
      const [ms2Sample] = await pool.query(`
        SELECT c.id, c.pagetitle, c.template, m.price, m.article 
        FROM ${prefix}site_content c
        JOIN ${prefix}ms2_products m ON c.id = m.id
        WHERE c.published = 1
        LIMIT 5
      `);
      console.log("\n--- MiniShop2 Products (Joined with Content) ---");
      console.table(ms2Sample);
    } catch (e) {
      console.log("No ms2_products table or error.");
    }

    // 2. FormIt Forms (Form submissions)
    try {
      const [formitCount] = await pool.query(`SELECT COUNT(*) as c FROM ${prefix}formit_forms`);
      console.log(`\n--- FormIt Submissions Count: ${(formitCount as any[])[0].c} ---`);
      if ((formitCount as any[])[0].c > 0) {
        const [formitSample] = await pool.query(`SELECT id, form, date, \`values\` FROM ${prefix}formit_forms ORDER BY id DESC LIMIT 2`);
        console.log("Sample FormIt Submissions:");
        (formitSample as any[]).forEach(f => {
            console.log(`Form: ${f.form}, Date: ${f.date}`);
            console.log(`Values: ${f.values.substring(0, 200)}...`);
        });
      }
    } catch (e) {
      console.log("No formit_forms table or error.", e);
    }

    // 3. MIGX Configs (More)
    try {
      const [migxConfigs] = await pool.query(`SELECT name, formtabs FROM ${prefix}migx_configs LIMIT 10 OFFSET 50`);
      console.log(`\n--- MIGX Configs (JSON Schemas) Part 7 ---`);
      (migxConfigs as any[]).forEach(c => {
        console.log(`Config: ${c.name}`);
        try {
            const tabs = JSON.parse(c.formtabs);
            const fields = tabs.flatMap((t: any) => t.fields.map((f: any) => f.field));
            console.log(`Fields: ${fields.join(', ')}`);
        } catch(err) {
            console.log(`Could not parse formtabs for ${c.name}`);
        }
      });
    } catch (e) {
      console.log("No migx_configs table or error.");
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

analyze();
