import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function exploreDatabase() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'modx_database',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  const dbName = process.env.DB_NAME || 'modx_database';
  const prefix = process.env.DB_PREFIX || 'modx_';

  try {
    console.log(`Analyzing database: ${dbName} with prefix: ${prefix}`);
    
    // Get all tables
    const [tables] = await pool.query(`
      SELECT TABLE_NAME, TABLE_ROWS 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME LIKE ?
      ORDER BY TABLE_ROWS DESC
    `, [dbName, `${prefix}%`]);

    console.log('\n--- TABLES (Sorted by Row Count) ---');
    const tableList = tables as any[];
    for (const table of tableList) {
      console.log(`- ${table.TABLE_NAME} (${table.TABLE_ROWS || 0} rows)`);
    }

    // Get columns for key tables
    const keyTables = [
      `${prefix}site_content`,
      `${prefix}site_tmplvars`,
      `${prefix}site_tmplvar_contentvalues`,
      `${prefix}categories`,
      `${prefix}site_templates`
    ];

    console.log('\n--- KEY TABLE STRUCTURES ---');
    for (const tableName of keyTables) {
      try {
        const [columns] = await pool.query(`
          SELECT COLUMN_NAME, DATA_TYPE, COLUMN_KEY, IS_NULLABLE, COLUMN_DEFAULT
          FROM information_schema.COLUMNS 
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
          ORDER BY ORDINAL_POSITION
        `, [dbName, tableName]);
        
        console.log(`\nTable: ${tableName}`);
        const colList = columns as any[];
        if (colList.length === 0) {
          console.log('  (Table not found or empty)');
          continue;
        }
        for (const col of colList) {
          const keyStr = col.COLUMN_KEY ? `[${col.COLUMN_KEY}]` : '';
          console.log(`  ${col.COLUMN_NAME.padEnd(20)} ${col.DATA_TYPE.padEnd(12)} ${keyStr}`);
        }
      } catch (err) {
        console.log(`  Error reading ${tableName}`);
      }
    }

    // Look for potential foreign keys or relations
    console.log('\n--- RELATIONSHIPS (Foreign Keys) ---');
    const [fks] = await pool.query(`
      SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE REFERENCED_TABLE_SCHEMA = ?
    `, [dbName]);
    
    const fkList = fks as any[];
    if (fkList.length > 0) {
      for (const fk of fkList) {
        console.log(`- ${fk.TABLE_NAME}.${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
      }
    } else {
      console.log('No explicit foreign keys found (MODX often uses implicit relations in code).');
    }

  } catch (error) {
    console.error("Error analyzing database:", error);
  } finally {
    await pool.end();
  }
}

exploreDatabase();
