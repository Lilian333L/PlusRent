const express = require('express');
const router = express.Router();
const TelegramNotifier = require('../config/telegram');

// Contact form submission
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, phone_country, message } = req.body;

        // Validate required fields
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and message are required'
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
