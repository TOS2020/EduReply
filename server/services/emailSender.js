const nodemailer = require('nodemailer');
const https = require('https');
const http = require('http');
require('dotenv').config();

async function downloadAttachment(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        };
        protocol.get(url, options, (res) => {
            if (res.statusCode >= 400) {
                return reject(new Error(`Failed to download attachment: Invalid status code ${res.statusCode}`));
            }
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', (err) => reject(err));
        }).on('error', (err) => reject(err));
    });
}

async function sendEmail(smtpConfig, to, subject, html, attachments) {
    if (!smtpConfig || !smtpConfig.user || !smtpConfig.pass) {
        throw new Error('User email credentials not configured');
    }

    const transporter = nodemailer.createTransport({
        host: smtpConfig.host || 'smtp.gmail.com',
        port: parseInt(smtpConfig.port) || 465,
        secure: parseInt(smtpConfig.port) === 465,
        auth: {
            user: smtpConfig.user,
            pass: smtpConfig.pass
        }
    });

    // Manually download attachments if they are URLs to provide custom headers (avoid 403)
    const processedAttachments = [];
    if (attachments && attachments.length > 0) {
        for (const attr of attachments) {
            if (attr.path && attr.path.startsWith('http')) {
                try {
                    console.log(`[Email] Downloading attachment: ${attr.path}`);
                    const content = await downloadAttachment(attr.path);
                    processedAttachments.push({
                        filename: attr.filename,
                        content: content
                    });
                } catch (err) {
                    console.error(`[Email] Attachment download failed: ${err.message}`);
                    throw new Error(`Failed to send email: ${err.message}`);
                }
            } else {
                processedAttachments.push(attr);
            }
        }
    }

    const mailOptions = {
        from: smtpConfig.user,
        to,
        subject,
        html,
        attachments: processedAttachments
    };

    return transporter.sendMail(mailOptions);
}

module.exports = { sendEmail };
