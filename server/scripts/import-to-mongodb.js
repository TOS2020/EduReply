const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { User, KnowledgeBase, AuthorizedStudent, Draft } = require('../models/schemas');

const DB_PATH = path.join(__dirname, '../data/db.json');
const MONGODB_URI = process.env.MONGODB_URI;

async function migrate() {
    if (!MONGODB_URI) {
        console.error('ERROR: MONGODB_URI not found in .env file');
        process.exit(1);
    }

    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected successfully!');

        const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

        // 1. Migrate Users
        console.log(`Migrating ${data.users.length} users...`);
        for (const userData of data.users) {
            await User.findOneAndUpdate(
                { email: userData.email },
                userData,
                { upsert: true, new: true }
            );
        }

        // 2. Migrate KnowledgeBase
        console.log(`Migrating ${data.knowledgeBase.length} KB entries...`);
        for (const kbData of data.knowledgeBase) {
            await KnowledgeBase.findOneAndUpdate(
                { keyword: kbData.keyword, userId: kbData.userId },
                kbData,
                { upsert: true }
            );
        }

        // 3. Migrate AuthorizedStudents
        console.log(`Migrating ${data.authorizedStudents.length} authorized students...`);
        for (const student of data.authorizedStudents) {
            let studentData;
            if (typeof student === 'string') {
                // Handle old format where it was just a string
                // Note: Without userId, this might be orphaned or we'd need to guess
                console.log(`Skipping string-only student: ${student} (missing userId)`);
                continue;
            } else {
                studentData = student;
            }
            await AuthorizedStudent.findOneAndUpdate(
                { email: studentData.email, userId: studentData.userId },
                studentData,
                { upsert: true }
            );
        }

        // 4. Migrate Drafts
        console.log(`Migrating ${data.drafts.length} drafts...`);
        for (const draftData of data.drafts) {
            await Draft.findOneAndUpdate(
                { id: draftData.id },
                draftData,
                { upsert: true }
            );
        }

        console.log('Migration completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await mongoose.disconnect();
    }
}

migrate();
