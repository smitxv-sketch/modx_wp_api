import { pool, getPrefix } from '../server/db';

async function run() {
  try {
    const prefix = getPrefix();
    const [res] = await pool.query(`
      SELECT id, pagetitle, template
      FROM ${prefix}site_content
      WHERE id IN (21, 22, 24, 209, 570)
    `);

    console.log("Parents of template 7:");
    console.table(res);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
