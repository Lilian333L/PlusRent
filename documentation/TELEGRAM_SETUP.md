# Telegram Notifications Setup Guide

This guide will help you set up Telegram notifications for your car rental website.

## Step 1: Create a Telegram Bot

1. **Open Telegram** and search for `@BotFather`
2. **Start a chat** with BotFather
3. **Send the command**: `/newbot`
4. **Follow the prompts**:
   - Enter a name for your bot (e.g., "Car Rental Notifications")
   - Enter a username for your bot (must end with 'bot', e.g., "mycarrental_bot")
5. **Save the bot token** that BotFather gives you (it looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

## Step 2: Get Your Chat ID

### Method 1: Using the Bot
1. **Start a chat** with your new bot
2. **Send any message** to the bot
3. **Visit this URL** in your browser (replace `YOUR_BOT_TOKEN` with your actual token):
   ```
   https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
   ```
4. **Look for the `chat.id`** in the response (it will be a number like `123456789`)

### Method 2: Using @userinfobot
1. **Search for `@userinfobot`** in Telegram
2. **Start a chat** with it
3. **Send any message** to get your chat ID

## Step 3: Configure Environment Variables

Create a `.env` file in your project root (if it doesn't exist) and add:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

## Step 4: Install Dependencies

The required dependencies are already installed:
- `axios` - for making HTTP requests to Telegram API

## Step 5: Test the Setup

1. **Start your server**: `npm start`
2. **Try adding a car** through the admin dashboard
3. **Check your Telegram** for a notification

## What You'll Receive Notifications For

### 🚗 Car Management
- **New car added** - Complete car details with pricing
- **Car updated** - Modified car information
- **Car deleted** - Car removal confirmation

### 📋 Booking Management
- **New booking request** - Customer details, car info, dates, pricing
- **Booking status changes** - Approvals/rejections

### 🎫 Coupon Management
- **New coupon added** - Code, discount, description
- **Coupon updated** - Modified coupon details
- **Coupon deleted** - Removal confirmation

## Notification Format

Each notification includes:
- **Emoji indicators** for easy identification
- **Structured information** with bullet points
- **Timestamps** for when actions occurred
- **HTML formatting** for better readability

## Troubleshooting

### No notifications received?
1. **Check your bot token** is correct
2. **Verify your chat ID** is correct
3. **Make sure you've started a chat** with your bot
4. **Check server logs** for error messages

### Bot not responding?
1. **Ensure the bot is active** (not blocked)
2. **Check if you've sent a message** to the bot first
3. **Verify the bot token** is valid

### Environment variables not working?
1. **Restart your server** after adding the `.env` file
2. **Check the file format** (no spaces around `=`)
3. **Verify the file is in the project root**

## Security Notes

- **Keep your bot token private** - don't commit it to version control
- **Use environment variables** for sensitive data
- **Consider using a private channel** for notifications instead of personal chat

## Customization

You can modify the notification messages by editing `config/telegram.js`:
- **Change message format** in the format methods
- **Add more information** to notifications
- **Customize emojis** and styling
- **Add different notification types**

## Support

If you encounter issues:
1. **Check the server console** for error messages
2. **Verify Telegram API** is accessible
3. **Test with a simple message** first
4. **Check your internet connection** 