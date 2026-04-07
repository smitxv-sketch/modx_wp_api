import { pool, getPrefix } from '../server/db';

async function run() {
  try {
    const prefix = getPrefix();
    const [templates] = await pool.query(`
      SELECT t.id, t.templatename, COUNT(c.id) as doc_count
      FROM ${prefix}site_templates t
      LEFT JOIN ${prefix}site_content c ON c.template = t.id AND c.published = 1
      GROUP BY t.id, t.templatename
      ORDER BY doc_count DESC
    `);
    console.log(JSON.stringify(templates, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
