# MIGRATION CONTEXT & DATA DICTIONARY
Generated: 2026-04-09T10:30:16.240Z

## OVERVIEW
This directory contains a complete, structured dump of the legacy MODX database. 
The goal of these files is to provide an AI Agent or Developer with **100% of the context** needed to design a new Strapi architecture and write a synchronization/migration script.

## CORE CONCEPTS (How MODX worked)
1. **Resources (Pages):** Everything in MODX is a "Resource" (stored in `site_content`). Doctors, Services, Reviews, Pages are all resources. They are differentiated by their `template` ID.
2. **Template Variables (TVs):** Custom fields attached to resources. They are merged into the `tvs` object in the JSON files.
3. **MIGX (Complex JSON TVs):** MODX used a plugin called MIGX to store complex arrays of objects (like FAQs, Galleries, Page Builder blocks) as stringified JSON inside a single TV. **We have pre-parsed these into actual JSON arrays for you.**

## DATA DICTIONARY (What is where)

### 1. Entities (The main content)
* `doctors.json` (Template 7, Parent != 209): Doctor profiles.
* `reviews.json` (Template 7, Parent == 209): Patient reviews. Note: Linked to doctors via the `doc` TV.
* `services.json` (Templates 6, 32): Medical services and categories.
* `articles.json` (Template 25): Blog posts. Uses complex MIGX dynamic zones for content blocks.
* `promotions.json` (Template 19): Special offers.
* `equipment.json` (Templates 8, 20, 29): Medical equipment.
* `branches.json` (Template 17): Clinic locations.
* `users.json`: Registered users and their profiles (passwords omitted).
* `custom_checkups.json`: Data from a custom table `modx_checkup`.

### 2. Relationships (`relationships.json`)
This is the **most important file for building relations in Strapi**. It maps every connection between entities:
* `parent_child`: The hierarchical tree (e.g., Service Category -> Specific Service).
* `tv_reference`: Explicit relations (e.g., Doctor -> Branch via `loc` TV).
* `inline_link`: Links found inside the raw HTML content (e.g., `<a href="[[~123]]">`). You must parse these during migration to link to the new Strapi URLs.
* `migx_reference`: Relations hidden inside JSON arrays (e.g., Service IDs inside a Doctor's price list TV).

### 3. E-Commerce / MiniShop2 Data
* `pricelists.json`: Prices are **NOT** stored inside the Service resources. They live in a custom table and link to services via `resource_id`.
* `ms2_product_categories.json`: Many-to-many category mappings for products/services.
* `ms2_product_options.json`: Additional custom fields for products.

### 4. Global Settings & Translations
* `global_clientconfig.json` & `global_system_settings.json`: Contains global variables like phone numbers, emails, and social links. Migrate these to a "Global Settings" Single Type in Strapi.
* `translations_content.json` & `translations_tvs.json`: Data from the Localizator plugin. Contains translated versions of resources and TVs.

### 5. Assets Manifest (`assets_manifest.json`)
A flat array of every physical file (images, PDFs) referenced in the database. 
**Migration Task:** Your script should download these files from `https://cispb.com{path}` and upload them to the Strapi Media Library, then update the references in the content.

### 6. Site Tree (`site_tree.json`)
A map of `Parent ID` -> `[Child IDs]`. Use this to reconstruct the URL routing and category nesting in the new platform.

### 7. Meta Schema (`meta_schema.json`)
Contains the original definitions of all Templates, TVs, and MIGX configurations. Use this to understand the *intended* data types of fields. It also includes `tv_template_map` to show which TVs belong to which Templates.

### 8. Code Elements (Chunks, Snippets, Plugins)
* `code_chunks.json`: Raw HTML templates used in MODX. Useful for extracting hardcoded frontend logic.
* `code_snippets.json` & `code_plugins.json`: Custom PHP logic. Useful for understanding custom backend behaviors that need to be rewritten in Node.js/Strapi.

## MIGRATION INSTRUCTIONS FOR AI AGENT
1. **Analyze `meta_schema.json`** to design Strapi Components and Dynamic Zones (especially for the Blog builder).
2. **Create Strapi Collections** for Doctors, Services, Reviews, Articles, Locations, etc. Create a Single Type for Global Settings using `global_clientconfig.json`.
3. **Write a Node.js Sync Script** that reads these JSON files.
4. **Process Assets First:** Iterate `assets_manifest.json`, upload to Strapi, keep a map of `Old URL -> Strapi Media ID`.
5. **Process Entities:** Upload entities, replacing old image URLs with Strapi Media IDs.
6. **Process Relationships:** Use `relationships.json` and `ms2_product_categories.json` to link entities together in Strapi (e.g., attach Reviews to Doctors).
7. **Clean HTML:** Parse the `content` fields. Replace MODX tags like `[[~123]]` with the new frontend URLs based on the `site_tree.json`. Remove or transform `[[!FormIt...]]` tags into frontend form components.
