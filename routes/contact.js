const express = require('express');
const router = express.Router();
const TelegramNotifier = require('../config/telegram');
const { normalize: normalizePhone } = require('../lib/phone-countries');

// North American 555-0100..0199 numbers are reserved for fiction and tests;
// form bots use them (+1 202 555 0148)
const FICTIONAL_PHONE = /^\+1\d{3}55501\d{2}$/;

// Contact form submission
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, phone_country, message, website } = req.body;

        // The hidden "website" field is left empty by people and filled by bots.
        // The bot is told it worked, so it has no reason to try another way.
        if (website) {
            return res.json({ success: true, message: 'Message sent successfully' });
        }

        // Validate required fields
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and message are required'
            });
        }

        // The page always sends the number in international form with its
        // country; spam posted straight to the API comes without a prefix
        const fullPhone = phone ? normalizePhone(phone, phone_country) : '';
        if (!fullPhone || !fullPhone.startsWith('+') || FICTIONAL_PHONE.test(fullPhone)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a phone number with the country code'
            });
        }

        // Built before the message, because the phone is formatted through it:
        // one country code, and a warning when the number arrived without one.
        const telegramNotifier = new TelegramNotifier();

        // Format the message for Telegram
        const telegramMessage = `
📧 *New Contact Form Submission*

👤 *Name:* ${name}
📧 *Email:* ${email}
📞 *Phone:* ${phone ? telegramNotifier.formatPhone(phone, phone_country) : 'Not provided'}
💬 *Message:*
${message}

---
*Time:* ${new Date().toLocaleString()}
*Source:* Contact Page
        `;

        // Send Telegram notification
        await telegramNotifier.sendMessage(telegramMessage);

        res.json({
            success: true,
            message: 'Message sent successfully'
        });

    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message. Please try again.'
        });
    }
});

module.exports = router;
