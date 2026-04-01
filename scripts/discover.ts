import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function discover() {
  console.log('Connecting to:', {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
  });

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const prefix = process.env.DB_PREFIX || 'modx_';

  console.log('--- MODX Database Discovery ---');

  try {
    // 1. List all tables
    const [tables] = await connection.query('SHOW TABLES') as any;
    console.log('Tables found:', tables.length);

    // 2. Check modx_site_content structure
    const [contentCols] = await connection.query(`DESCRIBE ${prefix}site_content`);
    console.log(`\nStructure of ${prefix}site_content:`);
    console.table(contentCols);

    // 3. Check TV values structure
    const [tvCols] = await connection.query(`DESCRIBE ${prefix}site_tmplvar_contentvalues`);
    console.log(`\nStructure of ${prefix}site_tmplvar_contentvalues:`);
    console.table(tvCols);

    // 4. Try to find "Doctors" and "Services"
    // Usually they are resources with specific templates or parent IDs.
    // We'll need to look at templates first.
    const [templates] = await connection.query(`SELECT id, templatename FROM ${prefix}site_templates`);
    console.log('\nTemplates:');
    console.table(templates);

    // 5. Look for TV names to identify where SKU, Photo, etc. might be
    const [tvs] = await connection.query(`SELECT id, name, caption FROM ${prefix}site_tmplvars`);
    console.log('\nTemplate Variables (TVs):');
    console.table(tvs);

    // 6. Fetch Sample Doctors (Template 7)
    const [doctors] = await connection.query(`
      SELECT id, pagetitle, alias, parent, editedon 
      FROM ${prefix}site_content 
      WHERE template = 7 AND published = 1 AND deleted = 0 
      LIMIT 3
    `);
    console.log('\nSample Doctors (Template 7):');
    console.table(doctors);

    if ((doctors as any[]).length > 0) {
      const docIds = (doctors as any[]).map(d => d.id);
      const [docTVs] = await connection.query(`
        SELECT cv.contentid, tv.name, cv.value 
        FROM ${prefix}site_tmplvar_contentvalues cv
        JOIN ${prefix}site_tmplvars tv ON cv.tmplvarid = tv.id
        WHERE cv.contentid IN (${docIds.join(',')})
      `);
      console.log('\nTV Values for Sample Doctors:');
      console.table(docTVs);
    }

    // 7. Fetch Sample Services (Template 32)
    const [services] = await connection.query(`
      SELECT id, pagetitle, alias, parent, editedon 
      FROM ${prefix}site_content 
      WHERE template = 32 AND published = 1 AND deleted = 0 
      LIMIT 5
    `);
    console.log('\nSample Services (Template 32):');
    console.table(services);

    if ((services as any[]).length > 0) {
      const serviceIds = (services as any[]).map(s => s.id);
      const [serviceTVs] = await connection.query(`
        SELECT cv.contentid, tv.name, cv.value 
        FROM ${prefix}site_tmplvar_contentvalues cv
        JOIN ${prefix}site_tmplvars tv ON cv.tmplvarid = tv.id
        WHERE cv.contentid IN (${serviceIds.join(',')})
        AND tv.name IN ('uslugiPrice', 'json_data', 'price', 'code', 'pricelist', 'related_specialist_block')
      `);
      console.log('\nKey TV Values for Sample Services:');
      (serviceTVs as any[]).forEach((tv: any) => {
        if (tv.name === 'json_data') {
          console.log(`\nService ID ${tv.contentid} - json_data:`);
          try {
            console.log(JSON.stringify(JSON.parse(tv.value), null, 2));
          } catch (e) {
            console.log(tv.value);
          }
        } else {
          console.log(`Service ID ${tv.contentid} - ${tv.name}: ${tv.value}`);
        }
      });
    }

    // 8. Relationship Check: How are doctors linked to services?
    // Let's check if there's a TV in doctors that points to services or vice versa.
    // Looking at TV list: 
    // ID 97: related_specialist_block (Выберите специалистов...)
    // ID 103: specListAction (Специалисты)
    // ID 61: revDoc (Врач) - likely for reviews
    
    console.log('\nChecking Doctor-Service relationships (TV 97 and 103):');
    const [relations] = await connection.query(`
        SELECT cv.contentid as service_id, sc.pagetitle as service_title, tv.name as tv_name, cv.value as linked_doctors
        FROM ${prefix}site_tmplvar_contentvalues cv
        JOIN ${prefix}site_tmplvars tv ON cv.tmplvarid = tv.id
        JOIN ${prefix}site_content sc ON cv.contentid = sc.id
        WHERE tv.id IN (97, 103) AND cv.value != ''
        LIMIT 5
    `);
    console.table(relations);

    // 9. Check for SKU/Articul in msProduct fields (if minishop2 is used)
    // The structure showed class_key = 'msProduct' for some rows.
    const [msProducts] = await connection.query(`
        SELECT id, pagetitle, class_key FROM ${prefix}site_content WHERE class_key = 'msProduct' LIMIT 3
    `);
    if ((msProducts as any[]).length > 0) {
        console.log('\nFound msProduct entries. Checking modx_ms2_products table if it exists:');
        try {
            const [msData] = await connection.query(`SELECT id, article, price, old_price, weight FROM ${prefix}ms2_products LIMIT 5`);
            console.log('\nMiniShop2 Product Data (modx_ms2_products):');
            console.table(msData);
        } catch (e) {
            console.log('modx_ms2_products table not found or inaccessible.');
        }
    }

  } catch (error) {
    console.error('Error during discovery:', error);
  } finally {
    await connection.end();
  }
}

discover();
