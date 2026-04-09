import { pool, getPrefix } from '../server/db';

async function analyze() {
  try {
    const prefix = getPrefix();
    
    const [tvs] = await pool.query(`
      SELECT tv.name, tv.caption, tvt.templateid
      FROM ${prefix}site_tmplvars tv
      JOIN ${prefix}site_tmplvar_templates tvt ON tv.id = tvt.tmplvarid
      WHERE tvt.templateid IN (6, 32)
      ORDER BY tvt.templateid, tv.name
    `);
    console.log("TVs for templates 6 and 32:");
    console.table(tvs);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

analyze();
