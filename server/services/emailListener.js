const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { User, KnowledgeBase, AuthorizedStudent, Draft } = require('../models/schemas');
const { generateEduReply } = require('./aiService');
require('dotenv').config();

const activityLogs = new Map(); // userId -> string[]

function logActivity(userId, message) {
    const logs = activityLogs.get(userId) || [];
    const timestamp = new Date().toLocaleTimeString();
    logs.unshift(`[${timestamp}] ${message}`);
    if (logs.length > 15) logs.pop();
    activityLogs.set(userId, logs);
    console.log(`[Email][User:${userId}] ${message}`);
}

async function processNewEmail(user, mail) {
    try {
        const sender = mail.from?.value?.[0]?.address;
        if (!sender) {
            logActivity(user.id, "Received email with no sender address. Skipping.");
            return;
        }
        const body = mail.text || mail.html;

        logActivity(user.id, `New email detected from: ${sender}`);

        // Check if sender is authorized for THIS user
        const authorized = await AuthorizedStudent.findOne({ userId: user.id, email: sender.toLowerCase().trim() });
        if (!authorized) {
            logActivity(user.id, `Skipping: ${sender} is NOT in your Authorized Students list.`);
            return;
        }

        logActivity(user.id, `Processing AI reply for ${sender}...`);
        
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
        logActivity(user.id, `Success: Created draft reply for ${sender}. Check your Drafts Review page!`);
    } catch (error) {
        logActivity(user.id, `Error: ${error.message}`);
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
        logActivity(user.id, "Connected to Gmail IMAP server.");

        // Open INBOX and stay there
        let lock = await client.getMailboxLock('INBOX');
        try {
            await client.mailboxOpen('INBOX');
            logActivity(user.id, "Monitoring INBOX for new messages...");
            
            // Proactive: Fetch the latest 3 messages immediately on startup
            const status = await client.status('INBOX', { messages: true });
            if (status.messages > 0) {
                const count = Math.min(3, status.messages);
                logActivity(user.id, `Startup: Checking last ${count} messages...`);
                for (let i = 0; i < count; i++) {
                    const message = await client.fetchOne(status.messages - i, { source: true });
                    if (message) {
                        const parsed = await simpleParser(message.source);
                        await processNewEmail(user, parsed);
                    }
                }
            }
            
            client.on('exists', async (data) => {
                logActivity(user.id, `Inbox updated: New message detected (Total: ${data.count})...`);
                // Re-acquire lock to fetch
                let fetchLock = await client.getMailboxLock('INBOX');
                try {
                    // Fetch the latest message
                    let message = await client.fetchOne(data.count, { source: true });
                    if (message) {
                        let parsed = await simpleParser(message.source);
                        await processNewEmail(user, parsed);
                    }
                } catch (fetchErr) {
                    logActivity(user.id, `Fetch Error: ${fetchErr.message}`);
                } finally {
                    fetchLock.release();
                }
            });
        } finally {
            lock.release();
        }
    } catch (err) {
        logActivity(user.id, `Connection Failed: ${err.message}`);
        // Clean up on failure
        activeListeners.delete(user.id);
    }
}

async function stopListenerForUser(userId) {
    const client = activeListeners.get(userId);
    if (client) {
        try {
            await client.logout();
            logActivity(userId, "Logged out from IMAP.");
        } catch (e) {
            logActivity(userId, `Logout Error: ${e.message}`);
        }
        activeListeners.delete(userId);
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

module.exports = { startEmailListener, startListenerForUser, stopListenerForUser, activeListeners, activityLogs };

