const db = require('../db');

async function listUsers() {
  try {
    const users = await db.all('SELECT id, username, isAdmin, isLocked, createdAt FROM users ORDER BY id');
    console.log('Users in database:');
    console.log(JSON.stringify(users, null, 2));
    
    console.log('\nUser configs:');
    const configs = await db.all('SELECT userId, elevenLabsKey, elevenLabsAgentId FROM user_config');
    console.log(JSON.stringify(configs, null, 2));
    
    console.log('\nSIP configs:');
    const sipConfigs = await db.all('SELECT userId, username, registrar FROM sip_config');
    console.log(JSON.stringify(sipConfigs, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

listUsers();
