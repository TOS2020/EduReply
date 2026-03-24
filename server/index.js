const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'edureply-secret-key-123';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/edureply';

const { User, KnowledgeBase, AuthorizedStudent, Draft } = require('./models/schemas');
const { generateEduReply } = require('./services/aiService');
const { startEmailListener, startListenerForUser } = require('./services/emailListener');
const { sendEmail } = require('./services/emailSender');

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB', err));


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

app.get('/ping', (req, res) => {
    res.json({ message: 'pong-v2' });
});

// Authentication Endpoints
// Health check route
app.get('/', (req, res) => {
    res.send('EduReply API is running!');
});

app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ 
            id: Date.now(), 
            name, 
            email, 
            password: hashedPassword,
            emailConfig: {
                smtp: { host: '', port: 465, user: '', pass: '' },
                imap: { host: '', port: 993, user: '', pass: '' }
            }
        });
        
        await newUser.save();
        
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
        const user = await User.findOne({ email });
        
        if (user && await bcrypt.compare(password, user.password)) {
            // Explicitly use the custom 'id' field to avoid Mongoose virtual 'id' (which is _id string)
            const userId = user.get('id');
            const token = jwt.sign({ id: userId, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
            res.json({ 
                token, 
                user: { id: userId, name: user.name, email: user.email } 
            });
        } else {
            res.status(401).json({ message: "Invalid credentials" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error during login", error: error.message });
    }
});

// User Settings Endpoints
app.get('/api/user/settings', authenticateToken, async (req, res) => {
    try {
        const user = await User.findOne({ id: req.user.id });
        if (!user) return res.status(404).json({ message: "User not found" });
        
        res.json({ emailConfig: user.emailConfig });
    } catch (error) {
        res.status(500).json({ message: "Error fetching settings", error: error.message });
    }
});

app.post('/api/user/settings', authenticateToken, async (req, res) => {
    try {
        const user = await User.findOne({ id: req.user.id });
        if (!user) return res.status(404).json({ message: "User not found" });
        
        user.emailConfig = req.body.emailConfig;
        await user.save();
        
        // Restart listener with new settings
        startListenerForUser(user);
        
        res.json({ message: "Settings updated successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error updating settings", error: error.message });
    }
});

// Knowledge Base Endpoints
app.get('/api/knowledge-base', authenticateToken, async (req, res) => {
    try {
        const userKB = await KnowledgeBase.find({ userId: req.user.id });
        res.json(userKB);
    } catch (error) {
        res.status(500).json({ message: "Error fetching knowledge base", error: error.message });
    }
});

app.post('/api/knowledge-base', authenticateToken, async (req, res) => {
    try {
        const newEntry = new KnowledgeBase({ ...req.body, userId: req.user.id });
        await newEntry.save();
        res.status(201).json(newEntry);
    } catch (error) {
        res.status(500).json({ message: "Error creating entry", error: error.message });
    }
});

app.put('/api/knowledge-base/:index', authenticateToken, async (req, res) => {
    try {
        const index = parseInt(req.params.index);
        const userEntries = await KnowledgeBase.find({ userId: req.user.id });
        
        if (index >= 0 && index < userEntries.length) {
            const entryId = userEntries[index]._id;
            const updatedEntry = await KnowledgeBase.findByIdAndUpdate(entryId, { ...req.body, userId: req.user.id }, { new: true });
            res.json(updatedEntry);
        } else {
            res.status(404).json({ message: "Entry not found" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error updating entry", error: error.message });
    }
});

app.delete('/api/knowledge-base/:index', authenticateToken, async (req, res) => {
    try {
        const index = parseInt(req.params.index);
        const userEntries = await KnowledgeBase.find({ userId: req.user.id });
        
        if (index >= 0 && index < userEntries.length) {
            const entryId = userEntries[index]._id;
            const removed = await KnowledgeBase.findByIdAndDelete(entryId);
            res.json({ message: "Entry removed", entry: removed });
        } else {
            res.status(404).json({ message: "Entry not found" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error removing entry", error: error.message });
    }
});

// Authorized Students Endpoints
app.get('/api/authorized-students', authenticateToken, async (req, res) => {
    try {
        const userStudents = await AuthorizedStudent.find({ userId: req.user.id });
        res.json(userStudents.map(s => s.email));
    } catch (error) {
        res.status(500).json({ message: "Error fetching students", error: error.message });
    }
});

app.post('/api/authorized-students', authenticateToken, async (req, res) => {
    try {
        const newStudent = new AuthorizedStudent({ email: req.body.email, userId: req.user.id });
        await newStudent.save();
        res.status(201).json(req.body);
    } catch (error) {
        res.status(500).json({ message: "Error adding student", error: error.message });
    }
});

app.put('/api/authorized-students/:index', authenticateToken, async (req, res) => {
    try {
        const index = parseInt(req.params.index);
        const userStudents = await AuthorizedStudent.find({ userId: req.user.id });
        
        if (index >= 0 && index < userStudents.length) {
            const studentId = userStudents[index]._id;
            const updated = await AuthorizedStudent.findByIdAndUpdate(studentId, { email: req.body.email }, { new: true });
            res.json({ email: updated.email });
        } else {
            res.status(404).json({ message: "Student not found" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error updating student", error: error.message });
    }
});

app.delete('/api/authorized-students/:index', authenticateToken, async (req, res) => {
    try {
        const index = parseInt(req.params.index);
        const userStudents = await AuthorizedStudent.find({ userId: req.user.id });
        
        if (index >= 0 && index < userStudents.length) {
            const studentId = userStudents[index]._id;
            const removed = await AuthorizedStudent.findByIdAndDelete(studentId);
            res.json({ message: "Student removed", email: removed.email });
        } else {
            res.status(404).json({ message: "Student not found" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error removing student", error: error.message });
    }
});

// Drafts Endpoints
app.get('/api/drafts', authenticateToken, async (req, res) => {
    try {
        const userDrafts = await Draft.find({ userId: req.user.id });
        res.json(userDrafts);
    } catch (error) {
        res.status(500).json({ message: "Error fetching drafts", error: error.message });
    }
});

app.delete('/api/drafts/:id', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const removed = await Draft.findOneAndDelete({ id: id, userId: req.user.id });
        
        if (removed) {
            res.json({ message: "Draft discarded" });
        } else {
            res.status(404).json({ message: "Draft not found" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error removing draft", error: error.message });
    }
});

// Approve and send draft
app.post('/api/drafts/:id/approve', authenticateToken, async (req, res) => {
    try {
        const draft = await Draft.findOne({ id: parseInt(req.params.id), userId: req.user.id });
        if (!draft) return res.status(404).json({ message: "Draft not found." });
        
        const user = await User.findOne({ id: req.user.id });
        if (!user) {
            console.error(`[Approve] User lookup failed for ID: ${req.user.id} (Type: ${typeof req.user.id})`);
            return res.status(404).json({ message: "User not found for this draft." });
        }
        
        if (!user.emailConfig || !user.emailConfig.smtp.user) {
            console.error(`[Approve] Email config missing for user: ${user.email}`, user.emailConfig);
            return res.status(400).json({ message: "Email configuration missing for this user." });
        }

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
                if (label.toLowerCase().endsWith('.pdf')) {
                    label = label.substring(0, label.length - 4).replace(/_/g, ' ').replace(/-/g, ' ');
                }
                finalHtml += `<a href="${link.path}">${label}</a><br>`;
            });
        }

        await sendEmail(
            user.emailConfig.smtp,
            draft.sender,
            "Re: " + (draft.originalSubject || "Your Inquiry"),
            finalHtml,
            realAttachments
        );

        draft.status = 'sent';
        await draft.save();
        res.json({ message: "Reply sent successfully!" });
    } catch (err) {
        console.error("Failed to send email:", err);
        res.status(500).json({ message: "Failed to send email: " + err.message });
    }
});

// Search for article
app.post('/api/drafts/:id/search-article', authenticateToken, async (req, res) => {
    try {
        const draft = await Draft.findOne({ id: parseInt(req.params.id), userId: req.user.id });
        if (!draft) return res.status(404).json({ message: "Draft not found." });

        if (!draft.articleQuery) return res.status(400).json({ message: "No article query detected for this draft." });

        res.json({ 
            message: "Article search initiated.",
            candidates: [
                { name: "Direct PDF (NVA)", url: "https://nva.sikt.no/registration/0198cc51d9ec-3e4859fd-6fda-4475-ad92-5888df8d3c6d/article.pdf" },
                { name: "ResearchGate PDF (Search)", url: `https://www.researchgate.net/search?q=${encodeURIComponent(draft.articleQuery)}` },
                { name: "Google Scholar", url: `https://scholar.google.com/scholar?q=${encodeURIComponent(draft.articleQuery)}` }
            ]
        });
    } catch (error) {
        res.status(500).json({ message: "Error searching article", error: error.message });
    }
});

// Attach a URL or file to a draft
app.post('/api/drafts/:id/attach-url', authenticateToken, async (req, res) => {
    try {
        const { url, filename } = req.body;
        const draft = await Draft.findOne({ id: parseInt(req.params.id), userId: req.user.id });
        if (!draft) return res.status(404).json({ message: "Draft not found." });

        if (!draft.attachments) draft.attachments = [];
        draft.attachments.push({ filename: filename || "article.pdf", path: url });
        
        await draft.save();
        res.json({ message: "Attachment added.", attachments: draft.attachments });
    } catch (error) {
        res.status(500).json({ message: "Error adding attachment", error: error.message });
    }
});

// Update a draft (edit feature)
app.put('/api/drafts/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { replyContent, isArticleRequest, articleQuery } = req.body;
        
        const draft = await Draft.findOne({ id: parseInt(id), userId: req.user.id });
        if (!draft) return res.status(404).json({ message: "Draft not found." });

        if (replyContent !== undefined) draft.replyContent = replyContent;
        if (isArticleRequest !== undefined) draft.isArticleRequest = isArticleRequest;
        if (articleQuery !== undefined) draft.articleQuery = articleQuery;

        await draft.save();
        res.json({ message: "Draft updated.", draft });
    } catch (error) {
        res.status(500).json({ message: "Error updating draft", error: error.message });
    }
});

// Remove an attachment from a draft
app.delete('/api/drafts/:id/attachments/:index', authenticateToken, async (req, res) => {
    try {
        const { id, index } = req.params;
        const draft = await Draft.findOne({ id: parseInt(id), userId: req.user.id });
        
        if (!draft) return res.status(404).json({ message: "Draft not found." });
        if (!draft.attachments || !draft.attachments[index]) return res.status(404).json({ message: "Attachment not found." });

        draft.attachments.splice(parseInt(index), 1);
        await draft.save();
        res.json({ message: "Attachment removed.", attachments: draft.attachments });
    } catch (error) {
        res.status(500).json({ message: "Error removing attachment", error: error.message });
    }
});

// Test SMTP Connection
app.post('/api/test-email-connection', authenticateToken, async (req, res) => {
    try {
        const user = await User.findOne({ id: req.user.id });
        
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
            tls: {
                rejectUnauthorized: false
            }
        });


        console.log(`[Test] Verifying SMTP connection for ${user.email}...`);
        await transporter.verify();
        res.json({ success: true, message: "SMTP Connection Verified!" });
    } catch (err) {
        console.error("[Test] SMTP Verification failed:", err);
        res.status(500).json({ success: false, message: err.message, stack: err.stack });
    }
});

// Email Simulation Trigger
app.post('/api/simulate-email', authenticateToken, async (req, res) => {
    try {
        const { sender, body } = req.body;
        const user = await User.findOne({ id: req.user.id });

        if (!user) return res.status(404).json({ message: "User not found" });

        // Filter: Check if sender is authorized for THIS user
        const authorized = await AuthorizedStudent.findOne({ userId: req.user.id, email: sender });
        if (!authorized) {
            return res.status(403).json({ message: "Sender not authorized." });
        }

        // AI Logic: Use user's knowledge base
        const userKB = await KnowledgeBase.find({ userId: req.user.id });
        const aiResult = await generateEduReply(body, userKB, user.email);

        // Save to Drafts
        const newDraft = new Draft({
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
            timestamp: new Date()
        });

        await newDraft.save();
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
