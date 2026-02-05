import { initDb, getDb } from '../db.js';

await initDb();
const db = getDb();

// Check sip_config table
const result = db.exec('SELECT COUNT(*) as cnt FROM sip_config');
console.log('SIP Config Records:', result[0]?.values[0]?.[0] || 0);

// Check if admin user exists
const adminCheck = db.exec("SELECT id FROM users WHERE username = 'admin'");
console.log('Admin user ID:', adminCheck[0]?.values[0]?.[0] || 'NOT FOUND');

// Check admin's sip_config
if (adminCheck[0]?.values[0]?.[0]) {
  const adminId = adminCheck[0].values[0][0];
  const sipCheck = db.exec(`SELECT user_id FROM sip_config WHERE user_id = ${adminId}`);
  console.log('Admin SIP Config exists:', sipCheck[0]?.values?.length > 0 ? 'YES' : 'NO');
}
