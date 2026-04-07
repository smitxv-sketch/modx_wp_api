import { pool, getPrefix } from '../server/db';

async function run() {
  try {
    const prefix = getPrefix();
    const [tvs] = await pool.query(`
      SELECT tv.name, tv.caption, tv.type, COUNT(tvc.id) as filled_count
      FROM ${prefix}site_tmplvars tv
      JOIN ${prefix}site_tmplvar_contentvalues tvc ON tv.id = tvc.tmplvarid
      WHERE tvc.value != '' AND tvc.value IS NOT NULL
      GROUP BY tv.id
      ORDER BY filled_count DESC
      LIMIT 50
    `);

    console.log("Top filled TVs:");
    console.table(tvs);
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
