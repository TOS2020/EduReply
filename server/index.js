const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'edureply-secret-key-123';

const { getData, saveData } = require('./services/db');
const { generateEduReply } = require('./services/aiService');
const { startEmailListener, startListenerForUser } = require('./services/emailListener');
const { sendEmail } = require('./services/emailSender');

// Middleware for authentication
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Invalid or expired token." });
        req.user = user;
        next();
    });
};

app.use(cors({
    origin: ['https://tos2020.github.io', 'https://TOS2020.github.io', 'http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

// Routes
app.get('/health', (req, res) => {
    res.json({ status: 'EduReply server is running' });
});

// Authentication Endpoints
// Health check route
app.get('/', (req, res) => {
    res.send('EduReply API is running!');
});

app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const data = getData();
        
        if (data.users.find(u => u.email === email)) {
            return res.status(400).json({ message: "User already exists" });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { 
            id: Date.now(), 
            name, 
            email, 
            password: hashedPassword,
            emailConfig: {
                smtp: { host: '', port: 465, user: '', pass: '' },
                imap: { host: '', port: 993, user: '', pass: '' }
            }
        };
        
        data.users.push(newUser);
        saveData(data);
        
        res.status(201).json({ 
            message: "Registration successful",
            user: { id: newUser.id, name: newUser.name, email: newUser.email }
        });
    } catch (error) {
        res.status(500).json({ message: "Error during registration", error: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const data = getData();
        const user = data.users.find(u => u.email === email);
        
        if (user && await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
            res.json({ 
                token, 
                user: { id: user.id, name: user.name, email: user.email } 
            });
        } else {
            res.status(401).json({ message: "Invalid credentials" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error during login", error: error.message });
    }
});

// User Settings Endpoints
app.get('/api/user/settings', authenticateToken, (req, res) => {
    const data = getData();
    const user = data.users.find(u => String(u.id) === String(req.user.id));
    if (!user) return res.status(404).json({ message: "User not found" });
    
    res.json({ emailConfig: user.emailConfig });
});

app.post('/api/user/settings', authenticateToken, (req, res) => {
    const data = getData();
    const userIndex = data.users.findIndex(u => String(u.id) === String(req.user.id));
    if (userIndex === -1) return res.status(404).json({ message: "User not found" });
    
    data.users[userIndex].emailConfig = req.body.emailConfig;
    saveData(data);
    
    // Restart listener with new settings
    startListenerForUser(data.users[userIndex]);
    
    res.json({ message: "Settings updated successfully" });
});

// Knowledge Base Endpoints
app.get('/api/knowledge-base', authenticateToken, (req, res) => {
    const data = getData();
    const userKB = data.knowledgeBase.filter(entry => String(entry.userId) === String(req.user.id));
    res.json(userKB);
});

app.post('/api/knowledge-base', authenticateToken, (req, res) => {
    const data = getData();
    const newEntry = { ...req.body, userId: req.user.id };
    data.knowledgeBase.push(newEntry);
    saveData(data);
    res.status(201).json(newEntry);
});

app.put('/api/knowledge-base/:index', authenticateToken, (req, res) => {
    const index = parseInt(req.params.index);
    const data = getData();
    
    // Find the actual index in the full array by filtering first
    const userEntries = data.knowledgeBase.filter(entry => String(entry.userId) === String(req.user.id));
    if (index >= 0 && index < userEntries.length) {
        const targetEntry = userEntries[index];
        const fullIndex = data.knowledgeBase.indexOf(targetEntry);
        data.knowledgeBase[fullIndex] = { ...req.body, userId: req.user.id };
        saveData(data);
        res.json(data.knowledgeBase[fullIndex]);
    } else {
        res.status(404).json({ message: "Entry not found" });
    }
});

app.delete('/api/knowledge-base/:index', authenticateToken, (req, res) => {
    const index = parseInt(req.params.index);
    const data = getData();
    
    const userEntries = data.knowledgeBase.filter(entry => String(entry.userId) === String(req.user.id));
    if (index >= 0 && index < userEntries.length) {
        const targetEntry = userEntries[index];
        const fullIndex = data.knowledgeBase.indexOf(targetEntry);
        const removed = data.knowledgeBase.splice(fullIndex, 1);
        saveData(data);
        res.json({ message: "Entry removed", entry: removed[0] });
    } else {
        res.status(404).json({ message: "Entry not found" });
    }
});

// Authorized Students Endpoints
app.get('/api/authorized-students', authenticateToken, (req, res) => {
    const data = getData();
    const userStudents = data.authorizedStudents.filter(s => String(s.userId) === String(req.user.id));
    res.json(userStudents.map(s => s.email));
});

app.post('/api/authorized-students', authenticateToken, (req, res) => {
    const data = getData();
    const newStudent = { email: req.body.email, userId: req.user.id };
    data.authorizedStudents.push(newStudent);
    saveData(data);
    res.status(201).json(req.body);
});

app.put('/api/authorized-students/:index', authenticateToken, (req, res) => {
    const index = parseInt(req.params.index);
    const data = getData();
    
    const userStudents = data.authorizedStudents.filter(s => String(s.userId) === String(req.user.id));
    if (index >= 0 && index < userStudents.length) {
        const targetStudent = userStudents[index];
        const fullIndex = data.authorizedStudents.indexOf(targetStudent);
        data.authorizedStudents[fullIndex] = { email: req.body.email, userId: req.user.id };
        saveData(data);
        res.json({ email: data.authorizedStudents[fullIndex].email });
    } else {
        res.status(404).json({ message: "Student not found" });
    }
});

app.delete('/api/authorized-students/:index', authenticateToken, (req, res) => {
    const index = parseInt(req.params.index);
    const data = getData();
    
    const userStudents = data.authorizedStudents.filter(s => String(s.userId) === String(req.user.id));
    if (index >= 0 && index < userStudents.length) {
        const targetStudent = userStudents[index];
        const fullIndex = data.authorizedStudents.indexOf(targetStudent);
        const removed = data.authorizedStudents.splice(fullIndex, 1);
        saveData(data);
        res.json({ message: "Student removed", email: removed[0].email });
    } else {
        res.status(404).json({ message: "Student not found" });
    }
});

// Drafts Endpoints
app.get('/api/drafts', authenticateToken, (req, res) => {
    const data = getData();
    const userDrafts = data.drafts.filter(d => String(d.userId) === String(req.user.id));
    res.json(userDrafts);
});

app.delete('/api/drafts/:id', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id);
    const data = getData();
    const index = data.drafts.findIndex(d => d.id === id && String(d.userId) === String(req.user.id));
    
    if (index !== -1) {
        data.drafts.splice(index, 1);
        saveData(data);
        res.json({ message: "Draft discarded" });
    } else {
        res.status(404).json({ message: "Draft not found" });
    }
});

// Approve and send draft
app.post('/api/drafts/:id/approve', authenticateToken, (req, res) => {
    const data = getData();
    const draftIndex = data.drafts.findIndex(d => d.id === parseInt(req.params.id) && String(d.userId) === String(req.user.id));
    
    if (draftIndex === -1) return res.status(404).json({ message: "Draft not found." });
    
    const draft = data.drafts[draftIndex];
    const user = data.users.find(u => String(u.id) === String(req.user.id));
    
    if (!user || !user.emailConfig || !user.emailConfig.smtp.user) {
        return res.status(400).json({ message: "Email configuration missing for this user." });
    }

    // Separate real files from webpage links
    const realAttachments = [];
    const linksToAppend = [];
    (draft.attachments || []).forEach(attr => {
        const isFile = attr.path.toLowerCase().split(/[?#]/)[0].endsWith('.pdf') || 
                       attr.path.toLowerCase().split(/[?#]/)[0].endsWith('.jpg') || 
                       attr.path.toLowerCase().split(/[?#]/)[0].endsWith('.png');
        if (isFile) {
            realAttachments.push(attr);
        } else {
            linksToAppend.push(attr);
        }
    });

    let finalHtml = (draft.replyContent || '').replace(/\n/g, '<br>');
    if (linksToAppend.length > 0) {
        finalHtml += '<br><br><strong>Related Links:</strong><br>';
        linksToAppend.forEach(link => {
            let label = link.filename || 'View Resource';
            // Strip .pdf if it's clearly a webpage and has .pdf in label
            if (label.toLowerCase().endsWith('.pdf')) {
                label = label.substring(0, label.length - 4).replace(/_/g, ' ').replace(/-/g, ' ');
            }
            finalHtml += `<a href="${link.path}">${label}</a><br>`;
        });
    }

    sendEmail(
        user.emailConfig.smtp,
        draft.sender,
        "Re: " + (draft.originalSubject || "Your Inquiry"),
        finalHtml,
        realAttachments
    ).then(() => {
        draft.status = 'sent';
        saveData(data);
        res.json({ message: "Reply sent successfully!" });
    }).catch(err => {
        console.error("Failed to send email:", err);
        res.status(500).json({ message: "Failed to send email: " + err.message });
    });
});

// Search for article (Stub for now, or use agent tool if possible)
app.post('/api/drafts/:id/search-article', authenticateToken, async (req, res) => {
    const data = getData();
    const draft = data.drafts.find(d => d.id === parseInt(req.params.id) && String(d.userId) === String(req.user.id));
    if (!draft) return res.status(404).json({ message: "Draft not found." });

    if (!draft.articleQuery) return res.status(400).json({ message: "No article query detected for this draft." });

    // In a real autonomous system, this would trigger a background worker with Puppeteer.
    // For now, we return a few candidate links that the teacher can choose from.
    res.json({ 
        message: "Article search initiated.",
        candidates: [
            { name: "Direct PDF (NVA)", url: "https://nva.sikt.no/registration/0198cc51d9ec-3e4859fd-6fda-4475-ad92-5888df8d3c6d/article.pdf" },
            { name: "ResearchGate PDF (Search)", url: `https://www.researchgate.net/search?q=${encodeURIComponent(draft.articleQuery)}` },
            { name: "Google Scholar", url: `https://scholar.google.com/scholar?q=${encodeURIComponent(draft.articleQuery)}` }
        ]
    });
});

// Attach a URL or file to a draft
app.post('/api/drafts/:id/attach-url', authenticateToken, (req, res) => {
    const { url, filename } = req.body;
    const data = getData();
    const draft = data.drafts.find(d => d.id === parseInt(req.params.id) && String(d.userId) === String(req.user.id));
    if (!draft) return res.status(404).json({ message: "Draft not found." });

    if (!draft.attachments) draft.attachments = [];
    draft.attachments.push({ filename: filename || "article.pdf", path: url });
    
    saveData(data);
    res.json({ message: "Attachment added.", attachments: draft.attachments });
});

// Update a draft (edit feature)
app.put('/api/drafts/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { replyContent, isArticleRequest, articleQuery } = req.body;
    const data = getData();
    const draft = data.drafts.find(d => String(d.id) === String(id) && String(d.userId) === String(req.user.id));
    
    if (!draft) return res.status(404).json({ message: "Draft not found." });

    if (replyContent !== undefined) draft.replyContent = replyContent;
    if (isArticleRequest !== undefined) draft.isArticleRequest = isArticleRequest;
    if (articleQuery !== undefined) draft.articleQuery = articleQuery;

    saveData(data);
    res.json({ message: "Draft updated.", draft });
});

// Remove an attachment from a draft
app.delete('/api/drafts/:id/attachments/:index', authenticateToken, (req, res) => {
    const { id, index } = req.params;
    const data = getData();
    const draft = data.drafts.find(d => String(d.id) === String(id) && String(d.userId) === String(req.user.id));
    
    if (!draft) return res.status(404).json({ message: "Draft not found." });
    if (!draft.attachments || !draft.attachments[index]) return res.status(404).json({ message: "Attachment not found." });

    draft.attachments.splice(parseInt(index), 1);
    saveData(data);
    res.json({ message: "Attachment removed.", attachments: draft.attachments });
});

// Test SMTP Connection
app.post('/api/test-email-connection', authenticateToken, async (req, res) => {
    const data = getData();
    const user = data.users.find(u => String(u.id) === String(req.user.id));
    
    if (!user || !user.emailConfig || !user.emailConfig.smtp.user) {
        return res.status(400).json({ message: "Email configuration missing." });
    }

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
        host: user.emailConfig.smtp.host || 'smtp.gmail.com',
        port: parseInt(user.emailConfig.smtp.port) || 465,
        secure: parseInt(user.emailConfig.smtp.port) === 465,
        auth: {
            user: user.emailConfig.smtp.user,
            pass: user.emailConfig.smtp.pass
        },
        connectionTimeout: 10000, // 10s
        greetingTimeout: 10000,
        socketTimeout: 10000
    });

    try {
        console.log(`[Test] Verifying SMTP connection for ${user.email}...`);
        await transporter.verify();
        res.json({ success: true, message: "SMTP Connection Verified!" });
    } catch (err) {
        console.error("[Test] SMTP Verification failed:", err);
        res.status(500).json({ success: false, message: err.message, stack: err.stack });
    }
});

// Email Simulation Trigger (now requires auth to know which teacher)
app.post('/api/simulate-email', authenticateToken, async (req, res) => {
    try {
        const { sender, body } = req.body;
        const data = getData();
        const user = data.users.find(u => String(u.id) === String(req.user.id));

        if (!user) return res.status(404).json({ message: "User not found" });

        // Filter: Check if sender is authorized for THIS user
        const isAuthorized = data.authorizedStudents.some(s => String(s.userId) === String(req.user.id) && s.email === sender);
        if (!isAuthorized) {
            return res.status(403).json({ message: "Sender not authorized." });
        }

        // AI Logic: Use user's knowledge base
        const userKB = data.knowledgeBase.filter(entry => entry.userId === req.user.id);
        const aiResult = await generateEduReply(body, userKB, user.email);

        // Save to Drafts
        const newDraft = {
            id: Date.now(),
            userId: req.user.id,
            sender,
            teacherEmail: user.email,
            originalBody: body,
            replyContent: aiResult.reply,
            isArticleRequest: aiResult.isArticleRequest,
            articleQuery: aiResult.articleQuery,
            attachments: [],
            status: 'pending',
            timestamp: new Date().toISOString()
        };

        data.drafts.push(newDraft);
        saveData(data);

        res.json({ message: "Email processed and draft created.", draft: newDraft });
    } catch (error) {
        console.error("Simulation error:", error);
        res.status(500).json({ message: "Error during simulation", error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    startEmailListener();
});
