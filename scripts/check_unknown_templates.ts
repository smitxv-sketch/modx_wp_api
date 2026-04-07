import { pool, getPrefix } from '../server/db';

async function run() {
  try {
    const prefix = getPrefix();
    
    // Get all TVs and their usage counts
    const [tvs] = await pool.query(`
      SELECT tv.name, tv.caption, tv.type, tvt.templateid, COUNT(tvc.id) as filled_count
      FROM ${prefix}site_tmplvars tv
      JOIN ${prefix}site_tmplvar_templates tvt ON tv.id = tvt.tmplvarid
      JOIN ${prefix}site_tmplvar_contentvalues tvc ON tv.id = tvc.tmplvarid
      WHERE tvc.value != '' AND tvc.value IS NOT NULL
      GROUP BY tv.id, tvt.templateid
      ORDER BY filled_count DESC
    `);

    // Group by template
    const byTemplate: Record<number, any[]> = {};
    (tvs as any[]).forEach(tv => {
      if (!byTemplate[tv.templateid]) byTemplate[tv.templateid] = [];
      byTemplate[tv.templateid].push(tv);
    });

    // We know templates 7, 6, 32, 4, 19, 25, 2 are mapped (Doctors, Services, News, Promotions, Articles, Pages).
    // Let's see what is heavily used on OTHER templates, or what TVs are on these templates but we might have missed.
    
    console.log("--- TVs on UNKNOWN templates ---");
    for (const [tpl, fields] of Object.entries(byTemplate)) {
      if (![7, 6, 32, 4, 19, 25, 2].includes(Number(tpl))) {
        console.log(`Template ${tpl}:`);
        console.table(fields.slice(0, 5));
      }
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
