const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

require('dotenv').config({ path: path.join(__dirname, '.env') });

async function initDatabase() {
  const sqlFile = path.join(__dirname, 'sql', 'create_tables.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  // Connect to MySQL without specifying database first
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    console.log('Executing SQL script...');
    
    // Split by semicolon and filter out empty statements and comments
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    for (const statement of statements) {
      if (statement.length > 10) {
        try {
          await pool.execute(statement);
        } catch (err) {
          // If execute fails, try query instead
          if (err.message.includes('prepared statement')) {
            await pool.query(statement);
          } else {
            throw err;
          }
        }
        console.log('Executed:', statement.substring(0, 50) + '...');
      }
    }

    console.log('Database initialized successfully!');
  } catch (err) {
    console.error('Error initializing database:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDatabase();
