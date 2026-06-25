const nodemailer = require('nodemailer');
const axios = require('axios');

const BREVO_EMAIL_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';
const getBrevoApiKey = () => process.env.BREVO_API_KEY || process.env.EMAIL_BREVO_API_KEY || '';
const stripHtml = (value = '') => String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// Legacy fallback for generic emails not yet using templates.
// Prefer using utils/email/dispatcher in new code.
const sendEmail = async (options) => {
    let transporter;
    const fromName = process.env.EMAIL_FROM_NAME || 'DocX Support';
    const fromAddr = process.env.EMAIL_FROM || 'noreply@docx.com';
    const replyTo = process.env.EMAIL_REPLY_TO || fromAddr;

    if (getBrevoApiKey()) {
        await axios.post(
            BREVO_EMAIL_ENDPOINT,
            {
                sender: {
                    name: fromName,
                    email: fromAddr,
                },
                to: [
                    {
                        email: options.email,
                    },
                ],
                replyTo: {
                    email: replyTo,
                    name: fromName,
                },
                subject: options.subject,
                htmlContent: options.message,
                textContent: stripHtml(options.message),
            },
            {
                headers: {
                    accept: 'application/json',
                    'api-key': getBrevoApiKey(),
                    'content-type': 'application/json',
                },
                timeout: 15000,
            }
        );
        return;
    }

    if (process.env.EMAIL_SMTP_USER && process.env.EMAIL_SMTP_PASS) {
        transporter = nodemailer.createTransport({
            host: process.env.EMAIL_SMTP_HOST || 'smtp-relay.brevo.com',
            port: process.env.EMAIL_SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_SMTP_USER,
                pass: process.env.EMAIL_SMTP_PASS
            }
        });
    } else {
        console.log('No Email Credentials Found. Using JSON Transport for local testing.');
        transporter = nodemailer.createTransport({
            jsonTransport: true
        });
    }

    const mailOptions = {
        from: fromName + ' <' + fromAddr + '>',
        replyTo,
        to: options.email,
        subject: options.subject,
        html: options.message
    };

    const info = await transporter.sendMail(mailOptions);

    if (transporter.options.jsonTransport) {
        console.log('---------------------------------------------------');
        console.log('EMAIL SENT (JSON Transport):');
        var message = JSON.parse(info.message);
        console.log('To: ' + message.to[0].address);
        console.log('Subject: ' + message.subject);
        console.log('---------------------------------------------------');

        var match = message.html.match(/href=(http:\/\/[^ ]+)/);
        return match ? match[1] : 'Check Server Console';
    }
};

module.exports = sendEmail;
