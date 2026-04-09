import { pool, getPrefix } from '../server/db';
import fs from 'fs/promises';
import path from 'path';

async function generate() {
  try {
    const prefix = getPrefix();
    const exportDir = path.join(process.cwd(), 'public', 'export');
    
    await fs.mkdir(exportDir, { recursive: true });
    console.log(`Exporting enhanced data to ${exportDir}...`);

    const writeJson = async (filename: string, data: any) => {
      await fs.writeFile(path.join(exportDir, filename), JSON.stringify(data, null, 2));
      console.log(`Created ${filename}`);
    };

    const writeText = async (filename: string, text: string) => {
      await fs.writeFile(path.join(exportDir, filename), text);
      console.log(`Created ${filename}`);
    };

    // 1. Fetch Resources
    const [resources] = await pool.query(`
      SELECT c.id, c.pagetitle, c.longtitle, c.description, c.introtext, c.content, c.alias, c.uri, c.parent, c.template, c.menuindex, c.isfolder, c.published, c.deleted, c.createdon, c.editedon, c.publishedon, p.image as ms2_image, p.thumb as ms2_thumb
      FROM ${prefix}site_content c
      LEFT JOIN ${prefix}ms2_products p ON p.id = c.id
    `);

    // 2. Fetch TV Values
    const [tvValues] = await pool.query(`
      SELECT tvc.contentid as resource_id, tv.name as tv_name, tvc.value 
      FROM ${prefix}site_tmplvar_contentvalues tvc
      JOIN ${prefix}site_tmplvars tv ON tv.id = tvc.tmplvarid
    `);

    const tvMap: Record<number, Record<string, any>> = {};
    (tvValues as any[]).forEach(row => {
      if (!tvMap[row.resource_id]) tvMap[row.resource_id] = {};
      let value = row.value;
      if (typeof value === 'string' && value.trim() !== '') {
        const trimmed = value.trim();
        if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
          try { value = JSON.parse(trimmed); } catch (e) {}
        } else if (trimmed.includes('||')) {
          value = trimmed.split('||');
        }
      }
      tvMap[row.resource_id][row.tv_name] = value;
    });

    const processedResources = (resources as any[]).map(res => ({
      ...res,
      tvs: tvMap[res.id] || {}
    }));

    // --- NEW: RELATIONSHIPS & ASSETS EXTRACTION ---
    const relationships: any[] = [];
    const assets = new Set<string>();
    const siteTree: any = {};

    // Helper to add asset
    const extractAssets = (text: string) => {
      if (!text || typeof text !== 'string') return;
      const regex = /(?:\/assets\/|\/images\/|images\/|assets\/)[a-zA-Z0-9_.\-\/]+\.(jpg|jpeg|png|gif|svg|pdf|doc|docx)/gi;
      let match;
      while ((match = regex.exec(text)) !== null) {
        assets.add(match[0].startsWith('/') ? match[0] : '/' + match[0]);
      }
    };

    // Helper to add relation
    const addRelation = (source: number, target: number, type: string, field?: string) => {
      if (target && !isNaN(target)) {
        relationships.push({ source_id: source, target_id: target, type, field });
      }
    };

    processedResources.forEach(res => {
      // Build Tree
      if (!siteTree[res.parent]) siteTree[res.parent] = [];
      siteTree[res.parent].push({ id: res.id, title: res.pagetitle, uri: res.uri });

      // Parent-Child Relation
      if (res.parent !== 0) addRelation(res.id, res.parent, 'parent_child', 'parent');

      // Extract internal links from content [[~ID]]
      if (res.content) {
        const linkRegex = /\[\[~(\d+)\]\]/g;
        let match;
        while ((match = linkRegex.exec(res.content)) !== null) {
          addRelation(res.id, parseInt(match[1]), 'inline_link', 'content');
        }
        extractAssets(res.content);
      }

      // Extract relations and assets from TVs
      Object.entries(res.tvs).forEach(([tvName, tvVal]: [string, any]) => {
        // Assets in strings
        if (typeof tvVal === 'string') {
          extractAssets(tvVal);
          // Check if it's a direct image TV
          if (tvVal.match(/\.(jpg|jpeg|png|gif|svg)$/i)) {
            assets.add(tvVal.startsWith('/') ? tvVal : '/' + tvVal);
          }
        }
        
        // Assets in JSON (MIGX)
        if (typeof tvVal === 'object') {
          extractAssets(JSON.stringify(tvVal));
        }

        // Specific TV Relations
        if (tvName === 'loc') {
          const locs = Array.isArray(tvVal) ? tvVal : [tvVal];
          locs.forEach(l => addRelation(res.id, parseInt(l), 'tv_reference', 'loc'));
        }
        if (tvName === 'uslugiPrice' && Array.isArray(tvVal)) {
          tvVal.forEach(u => addRelation(res.id, parseInt(u.service), 'migx_reference', 'uslugiPrice.service'));
        }
        if (tvName === 'specListAction') {
          const docs = Array.isArray(tvVal) ? tvVal : [tvVal];
          docs.forEach(d => addRelation(res.id, parseInt(d), 'tv_reference', 'specListAction'));
        }
        if (tvName === 'doc') {
          addRelation(res.id, parseInt(tvVal), 'tv_reference', 'doc');
        }
      });
    });

    // Group by entity type
    const entities = {
      doctors: processedResources.filter(r => r.template === 7 && r.parent !== 209),
      reviews: processedResources.filter(r => r.template === 7 && r.parent === 209),
      services: processedResources.filter(r => r.template === 32 || r.template === 6),
      news: processedResources.filter(r => r.template === 4),
      promotions: processedResources.filter(r => r.template === 19),
      articles: processedResources.filter(r => r.template === 25),
      pages: processedResources.filter(r => r.template === 2),
      programs: processedResources.filter(r => r.template === 12),
      branches: processedResources.filter(r => r.template === 17),
      equipment: processedResources.filter(r => [8, 20, 29].includes(r.template)),
      vacancies: processedResources.filter(r => r.template === 3),
      other: processedResources.filter(r => ![7, 32, 6, 4, 19, 25, 2, 12, 17, 8, 20, 29, 3].includes(r.template))
    };

    for (const [name, data] of Object.entries(entities)) {
      await writeJson(`${name}.json`, data);
    }

    // Write new context files
    await writeJson('relationships.json', relationships);
    await writeJson('assets_manifest.json', Array.from(assets));
    await writeJson('site_tree.json', siteTree);

    // 3. Fetch Pricelists
    try {
      const [prices] = await pool.query(`SELECT * FROM ${prefix}pricelist_items2`);
      await writeJson('pricelists.json', prices);
    } catch (e) {
      console.log("No pricelist_items2 table");
    }

    // --- NEW: FETCH ADDITIONAL DISCOVERED TABLES ---
    
    // 3a. Custom Tables
    try {
      const [checkups] = await pool.query(`SELECT * FROM ${prefix}checkup`);
      await writeJson('custom_checkups.json', checkups);
    } catch (e) {}

    // 3b. MiniShop2 Additional Data
    try {
      const [ms2Categories] = await pool.query(`SELECT * FROM ${prefix}ms2_product_categories`);
      await writeJson('ms2_product_categories.json', ms2Categories);
      
      const [ms2Options] = await pool.query(`SELECT * FROM ${prefix}ms2_product_options`);
      await writeJson('ms2_product_options.json', ms2Options);
    } catch (e) {}

    // 3c. Localizator (Translations)
    try {
      const [locContent] = await pool.query(`SELECT * FROM ${prefix}localizator_content`);
      await writeJson('translations_content.json', locContent);
      
      const [locTVs] = await pool.query(`SELECT * FROM ${prefix}localizator_tmplvar_contentvalues`);
      await writeJson('translations_tvs.json', locTVs);
    } catch (e) {}

    // 3d. Users
    try {
      const [users] = await pool.query(`
        SELECT u.id, u.username, u.active, p.fullname, p.email, p.phone, p.mobilephone, p.extended 
        FROM ${prefix}users u 
        JOIN ${prefix}user_attributes p ON u.id = p.internalKey
      `);
      await writeJson('users.json', users);
    } catch (e) {}

    // 3e. Global Settings
    try {
      const [clientConfig] = await pool.query(`SELECT * FROM ${prefix}clientconfig_setting`);
      await writeJson('global_clientconfig.json', clientConfig);
    } catch (e) {}
    
    try {
      const [sysSettings] = await pool.query(`SELECT \`key\`, \`value\` FROM ${prefix}system_settings`);
      await writeJson('global_system_settings.json', sysSettings);
    } catch (e) {}

    // 3f. Code Elements (Chunks, Snippets, Plugins)
    try {
      const [chunks] = await pool.query(`SELECT id, name, description, snippet as content FROM ${prefix}site_htmlsnippets`);
      await writeJson('code_chunks.json', chunks);
      
      const [snippets] = await pool.query(`SELECT id, name, description, snippet as code FROM ${prefix}site_snippets`);
      await writeJson('code_snippets.json', snippets);
      
      const [plugins] = await pool.query(`SELECT id, name, description, plugincode as code FROM ${prefix}site_plugins`);
      await writeJson('code_plugins.json', plugins);
    } catch (e) {}

    // 4. Fetch Redirects
    try {
      const [redirects] = await pool.query(`SELECT * FROM ${prefix}redirects`);
      await writeJson('redirects.json', redirects);
    } catch (e) {
      console.log("No redirects table");
    }

    // 5. Fetch Media
    try {
      const [media] = await pool.query(`SELECT * FROM ${prefix}ms2_product_files`);
      await writeJson('media.json', media);
    } catch (e) {
      console.log("No ms2_product_files table");
    }

    // 7. Meta / Schema Info
    const [templates] = await pool.query(`SELECT id, templatename, description FROM ${prefix}site_templates`);
    const [tvs] = await pool.query(`SELECT id, name, caption, description, type FROM ${prefix}site_tmplvars`);
    const [tvTemplates] = await pool.query(`SELECT tmplvarid, templateid FROM ${prefix}site_tmplvar_templates`);
    const [migx] = await pool.query(`SELECT name, formtabs FROM ${prefix}migx_configs`);
    
    const parsedMigx = (migx as any[]).map(m => {
        try { return { name: m.name, formtabs: JSON.parse(m.formtabs) }; }
        catch(e) { return m; }
    });

    await writeJson('meta_schema.json', {
      templates,
      tvs,
      tv_template_map: tvTemplates,
      migx_configs: parsedMigx,
      export_date: new Date().toISOString()
    });

    // --- NEW: MIGRATION GUIDE (The Hybrid Human/Machine Context) ---
    const migrationGuide = `# MIGRATION CONTEXT & DATA DICTIONARY
Generated: ${new Date().toISOString()}

## OVERVIEW
This directory contains a complete, structured dump of the legacy MODX database. 
The goal of these files is to provide an AI Agent or Developer with **100% of the context** needed to design a new Strapi architecture and write a synchronization/migration script.

## CORE CONCEPTS (How MODX worked)
1. **Resources (Pages):** Everything in MODX is a "Resource" (stored in \`site_content\`). Doctors, Services, Reviews, Pages are all resources. They are differentiated by their \`template\` ID.
2. **Template Variables (TVs):** Custom fields attached to resources. They are merged into the \`tvs\` object in the JSON files.
3. **MIGX (Complex JSON TVs):** MODX used a plugin called MIGX to store complex arrays of objects (like FAQs, Galleries, Page Builder blocks) as stringified JSON inside a single TV. **We have pre-parsed these into actual JSON arrays for you.**

## DATA DICTIONARY (What is where)

### 1. Entities (The main content)
* \`doctors.json\` (Template 7, Parent != 209): Doctor profiles.
* \`reviews.json\` (Template 7, Parent == 209): Patient reviews. Note: Linked to doctors via the \`doc\` TV.
* \`services.json\` (Templates 6, 32): Medical services and categories.
* \`articles.json\` (Template 25): Blog posts. Uses complex MIGX dynamic zones for content blocks.
* \`promotions.json\` (Template 19): Special offers.
* \`equipment.json\` (Templates 8, 20, 29): Medical equipment.
* \`branches.json\` (Template 17): Clinic locations.
* \`users.json\`: Registered users and their profiles (passwords omitted).
* \`custom_checkups.json\`: Data from a custom table \`modx_checkup\`.

### 2. Relationships (\`relationships.json\`)
This is the **most important file for building relations in Strapi**. It maps every connection between entities:
* \`parent_child\`: The hierarchical tree (e.g., Service Category -> Specific Service).
* \`tv_reference\`: Explicit relations (e.g., Doctor -> Branch via \`loc\` TV).
* \`inline_link\`: Links found inside the raw HTML content (e.g., \`<a href="[[~123]]">\`). You must parse these during migration to link to the new Strapi URLs.
* \`migx_reference\`: Relations hidden inside JSON arrays (e.g., Service IDs inside a Doctor's price list TV).

### 3. E-Commerce / MiniShop2 Data
* \`pricelists.json\`: Prices are **NOT** stored inside the Service resources. They live in a custom table and link to services via \`resource_id\`.
* \`ms2_product_categories.json\`: Many-to-many category mappings for products/services.
* \`ms2_product_options.json\`: Additional custom fields for products.

### 4. Global Settings & Translations
* \`global_clientconfig.json\` & \`global_system_settings.json\`: Contains global variables like phone numbers, emails, and social links. Migrate these to a "Global Settings" Single Type in Strapi.
* \`translations_content.json\` & \`translations_tvs.json\`: Data from the Localizator plugin. Contains translated versions of resources and TVs.

### 5. Assets Manifest (\`assets_manifest.json\`)
A flat array of every physical file (images, PDFs) referenced in the database. 
**Migration Task:** Your script should download these files from \`https://cispb.com{path}\` and upload them to the Strapi Media Library, then update the references in the content.

### 6. Site Tree (\`site_tree.json\`)
A map of \`Parent ID\` -> \`[Child IDs]\`. Use this to reconstruct the URL routing and category nesting in the new platform.

### 7. Meta Schema (\`meta_schema.json\`)
Contains the original definitions of all Templates, TVs, and MIGX configurations. Use this to understand the *intended* data types of fields. It also includes \`tv_template_map\` to show which TVs belong to which Templates.

### 8. Code Elements (Chunks, Snippets, Plugins)
* \`code_chunks.json\`: Raw HTML templates used in MODX. Useful for extracting hardcoded frontend logic.
* \`code_snippets.json\` & \`code_plugins.json\`: Custom PHP logic. Useful for understanding custom backend behaviors that need to be rewritten in Node.js/Strapi.

## MIGRATION INSTRUCTIONS FOR AI AGENT
1. **Analyze \`meta_schema.json\`** to design Strapi Components and Dynamic Zones (especially for the Blog builder).
2. **Create Strapi Collections** for Doctors, Services, Reviews, Articles, Locations, etc. Create a Single Type for Global Settings using \`global_clientconfig.json\`.
3. **Write a Node.js Sync Script** that reads these JSON files.
4. **Process Assets First:** Iterate \`assets_manifest.json\`, upload to Strapi, keep a map of \`Old URL -> Strapi Media ID\`.
5. **Process Entities:** Upload entities, replacing old image URLs with Strapi Media IDs.
6. **Process Relationships:** Use \`relationships.json\` and \`ms2_product_categories.json\` to link entities together in Strapi (e.g., attach Reviews to Doctors).
7. **Clean HTML:** Parse the \`content\` fields. Replace MODX tags like \`[[~123]]\` with the new frontend URLs based on the \`site_tree.json\`. Remove or transform \`[[!FormIt...]]\` tags into frontend form components.
`;

    await writeText('MIGRATION_GUIDE.md', migrationGuide);

    console.log("Enhanced export complete!");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

generate();
