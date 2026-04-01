import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function analyze() {
  const db = await createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  const prefix = process.env.DB_PREFIX || 'modx_';

  console.log("=== MODX DATABASE ANALYSIS ===");

  // 1. Get all templates and their usage count
  const [templates]: any = await db.query(`
    SELECT t.id, t.templatename, COUNT(c.id) as resource_count
    FROM ${prefix}site_templates t
    LEFT JOIN ${prefix}site_content c ON c.template = t.id AND c.deleted = 0
    GROUP BY t.id
    ORDER BY resource_count DESC
  `);
  console.log("\n1. Templates & Resource Counts:");
  console.table(templates.filter((t: any) => t.resource_count > 0));

  // 2. Find TV (Template Variables) names and types to understand data structure (especially images/photos)
  const [tvs]: any = await db.query(`
    SELECT id, name, caption, type, elements
    FROM ${prefix}site_tmplvars
  `);
  console.log("\n2. Template Variables (TVs) - Potential photos and relations:");
  const imageTvs = tvs.filter((tv: any) => tv.type === 'image');
  const relationTvs = tvs.filter((tv: any) => tv.type.includes('list') || tv.type === 'migx' || tv.type === 'checkbox');
  console.log("Image TVs:", imageTvs.map((tv: any) => tv.name).join(', '));
  console.log("Relation/Complex TVs:", relationTvs.map((tv: any) => `${tv.name} (${tv.type})`).join(', '));

  // 3. Sample a Doctor (Template 7) to see actual TV values
  const [sampleDoctor]: any = await db.query(`
    SELECT id, pagetitle FROM ${prefix}site_content WHERE template = 7 AND deleted = 0 LIMIT 1
  `);
  if (sampleDoctor.length > 0) {
    const docId = sampleDoctor[0].id;
    const [docTvs]: any = await db.query(`
      SELECT tv.name, tvc.value
      FROM ${prefix}site_tmplvar_contentvalues tvc
      JOIN ${prefix}site_tmplvars tv ON tv.id = tvc.tmplvarid
      WHERE tvc.contentid = ?
    `, [docId]);
    console.log(`\n3. Sample Doctor Data (ID: ${docId}, Name: ${sampleDoctor[0].pagetitle}):`);
    console.table(docTvs);
  }

  // 4. Check hierarchy (Parent-Child relationships)
  const [hierarchyStats]: any = await db.query(`
    SELECT parent, COUNT(*) as children_count
    FROM ${prefix}site_content
    WHERE deleted = 0 AND parent != 0
    GROUP BY parent
    ORDER BY children_count DESC
    LIMIT 5
  `);
  console.log("\n4. Top Parent Folders (Hierarchy):");
  for (const stat of hierarchyStats) {
    const [parentInfo]: any = await db.query(`SELECT pagetitle, template FROM ${prefix}site_content WHERE id = ?`, [stat.parent]);
    if (parentInfo.length > 0) {
      console.log(`- Parent ID ${stat.parent} ("${parentInfo[0].pagetitle}", Template: ${parentInfo[0].template}) has ${stat.children_count} children.`);
    }
  }

  await db.end();
}

analyze().catch(console.error);
