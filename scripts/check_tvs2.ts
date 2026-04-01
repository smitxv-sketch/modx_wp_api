import { pool, getPrefix } from "./server/db.js";

async function run() {
  const prefix = getPrefix();
  const [tvs] = await pool.query(`
    SELECT tv.name, tv.caption, tv.elements
    FROM ${prefix}site_tmplvars tv
    WHERE tv.name IN ('priceTemplate', 'categoryIs', 'tags', 'service_type', 'type') OR tv.caption LIKE '%тип%' OR tv.caption LIKE '%раздел%' OR tv.caption LIKE '%категор%'
  `);
  
  console.log("TVs:");
  console.log(tvs);

  process.exit(0);
}
run();
