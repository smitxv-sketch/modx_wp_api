import { pool, getPrefix } from '../server/db';

async function run() {
  try {
    const prefix = getPrefix();
    const [res] = await pool.query(`
      SELECT c.id, c.pagetitle, c.parent, c.template, tvc.value as revDate
      FROM ${prefix}site_content c
      JOIN ${prefix}site_tmplvar_contentvalues tvc ON c.id = tvc.contentid
      JOIN ${prefix}site_tmplvars tv ON tv.id = tvc.tmplvarid
      WHERE tv.name = 'revDate' AND tvc.value != ''
      LIMIT 10
    `);

    console.log("Sample resources with revDate:");
    console.table(res);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
