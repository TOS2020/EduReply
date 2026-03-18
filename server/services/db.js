const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/db.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Initialize DB if not exists
if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({
        users: [],
        knowledgeBase: [
            { userId: 1, key: "Exam Date", value: "October 12th" },
            { userId: 1, key: "Reading List", value: "Chapter 1-5 of 'The Biology of Plants'" }
        ],
        authorizedStudents: [
            { userId: 1, email: "student@example.com" }
        ],
        drafts: []
    }, null, 2));
}

function getData() {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
}

function saveData(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = { getData, saveData };
