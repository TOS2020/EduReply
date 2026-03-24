const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { User, KnowledgeBase, AuthorizedStudent, Draft } = require('../models/schemas');
const { generateEduReply } = require('./aiService');
require('dotenv').config();

const activeListeners = new Map();

async function processNewEmail(user, mail) {
    try {
        const sender = mail.from?.value?.[0]?.address;
        if (!sender) return;
        const body = mail.text || mail.html;

        console.log(`[Email] User ${user.email} received from: ${sender}`);

        // Check if sender is authorized for THIS user
        const authorized = await AuthorizedStudent.findOne({ userId: user.id, email: sender });
        if (!authorized) {
            console.log(`[Email] Sender ${sender} is not authorized for user ${user.email}. Skipping.`);
            return;
        }

        console.log(`[Email] Processing message for user ${user.email} from ${sender}...`);
        
        // Use user's knowledge base
        const userKB = await KnowledgeBase.find({ userId: user.id });
        const aiResult = await generateEduReply(body, userKB, user.email);

        const newDraft = new Draft({
            id: Date.now(),
            userId: user.id,
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
        console.log(`[Email] Draft created for ${user.email} from ${sender}`);
    } catch (error) {
        console.error(`[Email] Error processing email for user ${user.email}:`, error.message);
    }
}

async function startListenerForUser(user) {
    if (!user.emailConfig || !user.emailConfig.imap || !user.emailConfig.imap.user || !user.emailConfig.imap.pass) {
        console.log(`[Email] No IMAP config for user ${user.email}. Skipping listener.`);
        return;
    }

    // Stop existing listener if any
    if (activeListeners.has(user.id)) {
        await stopListenerForUser(user.id);
    }

    const client = new ImapFlow({
        host: user.emailConfig.imap.host || 'imap.gmail.com',
        port: parseInt(user.emailConfig.imap.port) || 993,
        secure: true,
        auth: {
            user: user.emailConfig.imap.user,
            pass: user.emailConfig.imap.pass
        },
        logger: false
    });

    client.on('error', err => {
        console.error(`[Email] IMAP Error for user ${user.email}:`, err.message);
    });

    try {
        await client.connect();
        activeListeners.set(user.id, client);
        console.log(`[Email] Connected to IMAP for user: ${user.email}`);

        let lock = await client.getMailboxLock('INBOX');
        try {
            client.on('exists', async (data) => {
                let message = await client.fetchOne(data.count, { source: true });
                let parsed = await simpleParser(message.source);
                await processNewEmail(user, parsed);
            });
            console.log(`[Email] Monitoring INBOX for user: ${user.email}`);
        } finally {
            lock.release();
        }
    } catch (err) {
        console.error(`[Email] Failed to connect for user ${user.email}:`, err.message);
    }
}

async function stopListenerForUser(userId) {
    const client = activeListeners.get(userId);
    if (client) {
        try {
            await client.logout();
        } catch (e) {
            console.error(`[Email] Error during IMAP logout for ${userId}:`, e.message);
        }
        activeListeners.delete(userId);
        console.log(`[Email] Stopped listener for user ID: ${userId}`);
    }
}

async function startEmailListener() {
    try {
        console.log('[Email] Starting all email listeners...');
        const users = await User.find({});
        
        for (const user of users) {
            await startListenerForUser(user);
        }
    } catch (error) {
        console.error('[Email] Error starting listeners:', error.message);
    }
}

module.exports = { startEmailListener, startListenerForUser, stopListenerForUser };

