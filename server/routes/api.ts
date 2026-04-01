import { Router } from "express";
import { pool, localDb, getPrefix, getExcludedIds } from "../db.js";

const router = Router();

// API Endpoints
router.get("/sync/settings/excluded", (req, res) => {
  try {
    const stmt = localDb.prepare('SELECT resource_id FROM excluded_resources');
    const rows = stmt.all();
    res.json(rows.map((r: any) => r.resource_id));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch excluded resources" });
  }
});

router.post("/sync/settings/toggle", (req, res) => {
  try {
    const { resource_id, exclude } = req.body;
    if (!resource_id) return res.status(400).json({ error: 'resource_id is required' });
    
    if (exclude) {
      const stmt = localDb.prepare('INSERT OR IGNORE INTO excluded_resources (resource_id) VALUES (?)');
      stmt.run(resource_id);
    } else {
      const stmt = localDb.prepare('DELETE FROM excluded_resources WHERE resource_id = ?');
      stmt.run(resource_id);
    }
    res.json({ success: true, resource_id, excluded: exclude });
  } catch (error) {
    res.status(500).json({ error: "Failed to toggle resource exclusion" });
  }
});

// GET export schema
router.get("/export/schema", (req, res) => {
  try {
    const templates = localDb.prepare('SELECT * FROM export_templates').all();
    const fields = localDb.prepare('SELECT * FROM export_fields').all();
    res.json({ templates, fields });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch export schema" });
  }
});

// POST update template schema
router.post("/export/schema/template", (req, res) => {
  try {
    const { template_id, is_exportable, alias } = req.body;
    if (template_id === undefined) return res.status(400).json({ error: 'template_id is required' });
    
    const stmt = localDb.prepare(`
      INSERT INTO export_templates (template_id, is_exportable, alias, updated_at) 
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(template_id) DO UPDATE SET 
        is_exportable = excluded.is_exportable,
        alias = excluded.alias,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(template_id, is_exportable ? 1 : 0, alias || null);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update template schema" });
  }
});

// POST update field schema
router.post("/export/schema/field", (req, res) => {
  try {
    const { template_id, field_name, is_exportable, alias, cast_type } = req.body;
    if (template_id === undefined || !field_name) return res.status(400).json({ error: 'template_id and field_name are required' });
    
    const stmt = localDb.prepare(`
      INSERT INTO export_fields (template_id, field_name, is_exportable, alias, cast_type, updated_at) 
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(template_id, field_name) DO UPDATE SET 
        is_exportable = excluded.is_exportable,
        alias = excluded.alias,
        cast_type = excluded.cast_type,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(template_id, field_name, is_exportable ? 1 : 0, alias || null, cast_type || 'string');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update field schema" });
  }
});

router.get("/sync/logs", async (req, res) => {
  res.json([]); // Placeholder for actual sync logs if implemented
});

router.get("/doctors", async (req, res) => {
  try {
    const prefix = getPrefix();
    const excludedIds = getExcludedIds();
    const excludeCondition = excludedIds.length > 0 ? `AND c.id NOT IN (${excludedIds.join(',')})` : '';
    const [doctors] = await pool.query(`
      SELECT c.id, c.pagetitle, c.alias, c.parent, p.image, p.thumb
      FROM ${prefix}site_content c
      LEFT JOIN ${prefix}ms2_products p ON p.id = c.id
      WHERE c.template = 7 AND c.published = 1 AND c.deleted = 0 ${excludeCondition}
    `);
    
    // 2. Fetch TVs for doctors
    const [tvValues] = await pool.query(`
      SELECT tvc.contentid as resource_id, tv.name as tv_name, tvc.value 
      FROM ${prefix}site_tmplvar_contentvalues tvc
      JOIN ${prefix}site_tmplvars tv ON tv.id = tvc.tmplvarid
      WHERE tvc.contentid IN (
        SELECT id FROM ${prefix}site_content WHERE template = 7
      )
    `);

    // 3. Map TVs to doctors
    const doctorsWithDetails = (doctors as any[]).map(doc => {
      const docTvs = (tvValues as any[]).filter(tv => tv.resource_id === doc.id);
      const tvMap: Record<string, string> = {};
      docTvs.forEach(tv => {
        tvMap[tv.tv_name] = tv.value;
      });

      return {
        ...doc,
        name: doc.pagetitle,
        rank: tvMap['rank'] || '',
        specialization: tvMap['specintro'] || '',
        experience: tvMap['specExperience'] || '',
        education: tvMap['education'] || '',
        description: tvMap['des'] || '',
        photo: doc.image || tvMap['docImg'] || '',
        thumb: doc.thumb || '',
        seo: {
          title: tvMap['title'] || '',
          description: tvMap['des'] || ''
        },
        tvs: tvMap
      };
    });
    
    res.json(doctorsWithDetails);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Failed to fetch doctors from database", details: String(error) });
  }
});

router.get("/services", async (req, res) => {
  try {
    const prefix = getPrefix();
    const excludedIds = getExcludedIds();
    const excludeCondition = excludedIds.length > 0 ? `AND id NOT IN (${excludedIds.join(',')})` : '';
    const [services] = await pool.query(`
      SELECT id, pagetitle, longtitle, description, introtext, content, parent as parent_id, alias 
      FROM ${prefix}site_content 
      WHERE template IN (6, 32) AND published = 1 AND deleted = 0 ${excludeCondition}
    `);

    // 2. Get categories (parents of services)
    const [categories] = await pool.query(`
      SELECT id, pagetitle 
      FROM ${prefix}site_content 
      WHERE id IN (SELECT DISTINCT parent FROM ${prefix}site_content WHERE template IN (6, 32))
    `);

    // 3. Get price items from custom table
    let priceItems = [];
    try {
      const [prices] = await pool.query(`
        SELECT * FROM ${prefix}pricelist_items2
      `);
      priceItems = prices as any[];
    } catch (e) {
      console.warn("Table pricelist_items2 might not exist yet:", e);
    }

    // 4. Fetch TVs for services
    const [tvValues] = await pool.query(`
      SELECT tvc.contentid as resource_id, tv.name as tv_name, tvc.value 
      FROM ${prefix}site_tmplvar_contentvalues tvc
      JOIN ${prefix}site_tmplvars tv ON tv.id = tvc.tmplvarid
      WHERE tvc.contentid IN (
        SELECT id FROM ${prefix}site_content WHERE template IN (6, 32)
      )
    `);

    // 5. Map them together
    const servicesWithDetails = (services as any[]).map(s => {
      const category = (categories as any[]).find(c => c.id === s.parent_id);
      
      // Filter prices where the resource_id matches the service id
      const servicePrices = priceItems.filter(p => p.resource_id === s.id);

      // Map TVs
      const srvTvs = (tvValues as any[]).filter(tv => tv.resource_id === s.id);
      const tvMap: Record<string, string> = {};
      srvTvs.forEach(tv => {
        tvMap[tv.tv_name] = tv.value;
      });

      return {
        ...s,
        category,
        price_items: servicePrices,
        description: tvMap['des'] || '',
        image: tvMap['img'] || '',
        seo: {
          title: tvMap['title'] || '',
          description: tvMap['des'] || ''
        },
        tvs: tvMap,
        doctors: [],
        locations: []
      };
    });

    res.json(servicesWithDetails);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Failed to fetch services from database", details: String(error) });
  }
});

router.get("/sync/full-graph", async (req, res) => {
  try {
    const prefix = getPrefix();
    const includeExcluded = req.query.include_excluded === 'true';
    const excludedIds = getExcludedIds();
    const excludeCondition = (!includeExcluded && excludedIds.length > 0) ? `AND c.id NOT IN (${excludedIds.join(',')})` : '';
    
    // 1. Fetch Resources (All non-deleted)
    const [resources] = await pool.query(`
      SELECT c.id, c.pagetitle, c.longtitle, c.description, c.introtext, c.content, c.alias, c.parent, c.template, c.menuindex, c.isfolder, c.published, c.deleted, c.createdon, c.editedon, c.publishedon, p.image as ms2_image, p.thumb as ms2_thumb
      FROM ${prefix}site_content c
      LEFT JOIN ${prefix}ms2_products p ON p.id = c.id
      WHERE c.deleted = 0 ${excludeCondition}
    `);

    // 2. Fetch TV Values for these resources
    const [tvValues] = await pool.query(`
      SELECT tvc.contentid as resource_id, tv.name as tv_name, tvc.value 
      FROM ${prefix}site_tmplvar_contentvalues tvc
      JOIN ${prefix}site_tmplvars tv ON tv.id = tvc.tmplvarid
    `);

    // Group TV values by resource_id
    const tvMap: Record<number, Record<string, any>> = {};
    (tvValues as any[]).forEach(row => {
      if (!tvMap[row.resource_id]) {
        tvMap[row.resource_id] = {};
      }
      
      let value = row.value;
      // Parse MIGX JSON fields if they exist
      const migxFields = ['uslugiPrice', 'certificates', 'education_items', 'faq_services', 'slider', 'homeAbout', 'blogTags', 'blogBlocks', 'action_form', 'check_up', 'gift_images', 'photo_list', 'equipment_list'];
      if (migxFields.includes(row.tv_name)) {
        try {
          value = JSON.parse(value);
        } catch (e) {
          value = [];
        }
      }
      
      tvMap[row.resource_id][row.tv_name] = value;
    });

    // Merge TVs into resources and determine main image
    const processedResources = (resources as any[]).map(res => {
      const tvs = tvMap[res.id] || {};
      
      let mainImage = tvs.image || tvs.img || '';
      if (res.template === 7) mainImage = res.ms2_image || tvs.docImg || mainImage; // Doctor
      if (res.template === 4) mainImage = tvs.newsImg || mainImage; // News
      if (res.template === 19) mainImage = tvs.newsImg || mainImage; // Promo
      if (res.template === 25) mainImage = tvs.blogImage || mainImage; // Blog

      let tags: string[] = [];
      if (tvs.tags) {
        tags = String(tvs.tags).split(',').map(t => t.trim()).filter(Boolean);
      }

      return {
        ...res,
        tvs,
        mainImage,
        tags
      };
    });

    // 3. Fetch all Price Items
    let priceItems = [];
    try {
      const [prices] = await pool.query(`
        SELECT * FROM ${prefix}pricelist_items2
      `);
      priceItems = prices as any[];
    } catch (e) {
      console.warn("Table pricelist_items2 might not exist yet:", e);
    }

    // 4. Fetch Redirects
    let redirects = [];
    try {
      const [redirs] = await pool.query(`
        SELECT id, pattern as old_url, target as new_slug
        FROM ${prefix}redirects
        WHERE active = 1
      `);
      redirects = redirs as any[];
    } catch (e) {
      console.warn("Table redirects might not exist:", e);
    }

    // 5. Fetch Media (ms2_product_files)
    let media = [];
    try {
      const [files] = await pool.query(`
        SELECT id, product_id, name, file as original_path, type, url, properties
        FROM ${prefix}ms2_product_files
        WHERE active = 1
      `);
      media = files as any[];
    } catch (e) {
      console.warn("Table ms2_product_files might not exist:", e);
    }
    
    const uniqueLocations = new Map<number, any>();
    processedResources.forEach(r => {
      if (r.tvs?.loc) {
        const locIds = Array.isArray(r.tvs.loc) ? r.tvs.loc : String(r.tvs.loc).split('||');
        locIds.forEach((id: string) => {
          const locId = parseInt(id);
          if (!isNaN(locId) && !uniqueLocations.has(locId)) {
            uniqueLocations.set(locId, {
              id: locId,
              name: locId === 1 ? 'Финский пер., 4' : `Location ${locId}`
            });
          }
        });
      }
    });

    res.json({
      timestamp: new Date().toISOString(),
      source_tables: [
        `${prefix}site_content`,
        `${prefix}site_tmplvar_contentvalues`,
        `${prefix}pricelist_items2`,
        `${prefix}redirects`,
        `${prefix}ms2_product_files`
      ],
      entities: {
        resources: processedResources,
        price_items: priceItems,
        locations: Array.from(uniqueLocations.values()),
        doctors: processedResources.filter(r => r.template === 7),
        services: processedResources.filter(r => r.template === 32 || r.template === 6),
        articles: processedResources.filter(r => r.template === 4 || r.template === 25 || r.template === 19),
        media: media,
        redirects: redirects
      },
      mappings: {
        resource_hierarchy: `${prefix}site_content (id -> parent)`,
        service_data: `${prefix}site_tmplvar_contentvalues (contentid -> resource.id)`,
        price_mapping: `${prefix}pricelist_items2 (resource_id -> resource.id, json_data TV)`
      }
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Failed to fetch full graph from database", details: String(error) });
  }
});

router.get("/health", async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: "ok", modx_connection: "connected" });
  } catch (error) {
    res.status(500).json({ status: "error", modx_connection: "failed", details: String(error) });
  }
});



export default router;
