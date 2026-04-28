const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

const sqlFile = path.join(__dirname, 'sql', 'create_tables.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

// Split by semicolon and filter out empty statements
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`Executing ${statements.length} SQL statements...`);

let index = 0;
function executeNext() {
  if (index >= statements.length) {
    console.log('All SQL statements executed successfully!');
    process.exit(0);
  }

  const statement = statements[index];
  const command = `C:\\WINDOWS\\system32\\mysql -u root -e "${statement.replace(/"/g, '\\"')}"`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing statement ${index + 1}:`, error.message);
      console.error('Statement:', statement.substring(0, 100) + '...');
      process.exit(1);
    }
    if (stderr) {
      console.warn(`Warning for statement ${index + 1}:`, stderr);
    }
    index++;
    executeNext();
  });
}

executeNext();
