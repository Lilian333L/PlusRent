const express = require('express');
const router = express.Router();
const TelegramNotifier = require('../config/telegram');

// Contact form submission
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;

        // Validate required fields
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and message are required'
            });
        }

        // Format the message for Telegram
        const telegramMessage = `
📧 *New Contact Form Submission*

👤 *Name:* ${name}
📧 *Email:* ${email}
📞 *Phone:* ${phone || 'Not provided'}
💬 *Message:*
${message}

---
*Time:* ${new Date().toLocaleString()}
*Source:* Contact Page
        `;

        // Send Telegram notification
        const telegramNotifier = new TelegramNotifier();
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
