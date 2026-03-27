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

    const isBrevo = smtpConfig.host && smtpConfig.host.includes('brevo.com');
    const isSendGrid = smtpConfig.host && smtpConfig.host.includes('sendgrid.net');

    // Manually download attachments if they are URLs
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

    if (isBrevo) {
        console.log(`[Email] Brevo detected. Using HTTPS API fallback for reliability on Render.`);
        return new Promise((resolve, reject) => {
            const payload = {
                sender: { email: smtpConfig.user.trim() },
                to: [{ email: to.trim() }],
                subject: subject,
                htmlContent: html
            };

            if (processedAttachments.length > 0) {
                payload.attachment = processedAttachments.map(a => ({
                    content: a.content.toString('base64'),
                    name: a.filename
                }));
            }

            const data = JSON.stringify(payload);

            const options = {
                hostname: 'api.brevo.com',
                port: 443,
                path: '/v3/smtp/email',
                method: 'POST',
                headers: {
                    'api-key': smtpConfig.pass.trim(),
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            };

            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', (d) => body += d);
                res.on('end', () => {
                    if (res.statusCode < 300) {
                        console.log('[Email] Sent successfully via Brevo API');
                        resolve({ messageId: JSON.parse(body).messageId });
                    } else {
                        console.error('[Email] Brevo API Error:', body);
                        reject(new Error(`Brevo API Error: ${res.statusCode} - ${body}`));
                    }
                });
            });

            req.on('error', (e) => reject(e));
            req.write(data);
            req.end();
        });
    }

    if (isSendGrid) {
        console.log(`[Email] SendGrid detected. Using HTTPS API fallback for reliability on Render.`);
        return new Promise((resolve, reject) => {
            const payload = {
                personalizations: [{
                    to: [{ email: to.trim() }]
                }],
                from: { email: smtpConfig.user.trim() },
                subject: subject,
                content: [{
                    type: 'text/html',
                    value: html
                }]
            };

            if (processedAttachments.length > 0) {
                payload.attachments = processedAttachments.map(a => ({
                    content: a.content.toString('base64'),
                    filename: a.filename,
                    type: 'application/octet-stream',
                    disposition: 'attachment'
                }));
            }

            const data = JSON.stringify(payload);

            const options = {
                hostname: 'api.sendgrid.com',
                port: 443,
                path: '/v3/mail/send',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${smtpConfig.pass.trim()}`,
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            };

            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', (d) => body += d);
                res.on('end', () => {
                    if (res.statusCode < 300) {
                        console.log('[Email] Sent successfully via SendGrid API');
                        resolve({ success: true });
                    } else {
                        console.error('[Email] SendGrid API Error:', body);
                        let errorMessage = body;
                        try {
                            const parsed = JSON.parse(body);
                            if (parsed.errors && parsed.errors[0]) {
                                errorMessage = parsed.errors[0].message;
                            }
                        } catch (e) {}
                        reject(new Error(`SendGrid Error: ${errorMessage}`));
                    }
                });
            });

            req.on('error', (e) => reject(e));
            req.write(data);
            req.end();
        });
    }

    console.log(`[Email] Connecting to SMTP: ${smtpConfig.host || 'smtp.gmail.com'}:${parseInt(smtpConfig.port) || 465}`);
    
    const transporter = nodemailer.createTransport({
        host: smtpConfig.host || 'smtp.gmail.com',
        port: parseInt(smtpConfig.port) || 465,
        secure: parseInt(smtpConfig.port) === 465,
        auth: {
            user: smtpConfig.user,
            pass: smtpConfig.pass
        },
        tls: {
            rejectUnauthorized: false
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 60000,
        logger: true,
        debug: true
    });

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
