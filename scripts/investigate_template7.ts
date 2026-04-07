import { pool, getPrefix } from '../server/db';

async function run() {
  try {
    const prefix = getPrefix();
    const [res] = await pool.query(`
      SELECT parent, COUNT(*) as count
      FROM ${prefix}site_content
      WHERE template = 7
      GROUP BY parent
    `);

    console.log("Template 7 resources grouped by parent:");
    console.table(res);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
