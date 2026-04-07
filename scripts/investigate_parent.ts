import { pool, getPrefix } from '../server/db';

async function run() {
  try {
    const prefix = getPrefix();
    const [res] = await pool.query(`
      SELECT id, pagetitle, parent, template
      FROM ${prefix}site_content
      WHERE id = 209
    `);

    console.log("Resource 209:");
    console.table(res);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
