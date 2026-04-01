import { pool, getPrefix } from "./server/db.js";

async function run() {
  const prefix = getPrefix();
  const [tvs] = await pool.query(`
    SELECT DISTINCT tv.name, tv.caption
    FROM ${prefix}site_tmplvars tv
    JOIN ${prefix}site_tmplvar_templates tvt ON tv.id = tvt.tmplvarid
    WHERE tvt.templateid IN (6, 32)
  `);
  console.log(tvs);
  process.exit(0);
}
run();
