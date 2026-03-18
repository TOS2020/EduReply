const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '../data/db.json');

async function migrate() {
    try {
        const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        let migratedCount = 0;

        for (const user of data.users) {
            // If password doesn't start with $2a$ (standard bcrypt prefix), it might be plain text
            if (user.password && !user.password.startsWith('$2a$')) {
                console.log(`Hashing password for user: ${user.email}`);
                user.password = await bcrypt.hash(user.password, 10);
                migratedCount++;
            }
        }

        if (migratedCount > 0) {
            fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
            console.log(`Successfully migrated ${migratedCount} users.`);
        } else {
            console.log('No users needed migration.');
        }
    } catch (err) {
        console.error('Migration failed:', err.message);
    }
}

migrate();
