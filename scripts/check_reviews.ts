import { pool, getPrefix } from '../server/db';

async function run() {
  try {
    const prefix = getPrefix();
    const [res] = await pool.query(`
      SELECT sc.template, COUNT(sc.id) as c
      FROM ${prefix}site_content sc
      JOIN ${prefix}site_tmplvar_contentvalues tvc ON sc.id = tvc.contentid
      JOIN ${prefix}site_tmplvars tv ON tv.id = tvc.tmplvarid
      WHERE tv.name = 'revDate'
      GROUP BY sc.template
    `);

    console.table(res);
    
    const [templates] = await pool.query(`
      SELECT id, templatename FROM ${prefix}site_templates WHERE id IN (SELECT template FROM ${prefix}site_content WHERE id IN (SELECT contentid FROM ${prefix}site_tmplvar_contentvalues WHERE tmplvarid = (SELECT id FROM ${prefix}site_tmplvars WHERE name = 'revDate')))
    `);
    console.table(templates);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
