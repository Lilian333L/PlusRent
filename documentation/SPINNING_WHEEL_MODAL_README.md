# 🎯 Spinning Wheel Modal System

This system automatically displays a spinning wheel modal after 5 minutes of browsing, encouraging user engagement and conversions.

## 🚀 Quick Start

### 1. Include the Script
Add this single line to any HTML page where you want the modal to appear:

```html
<script src="js/universal-spinning-wheel.js"></script>
```

### 2. That's It!
The modal will automatically appear after 5 minutes of browsing, but only once per day per user.

## 📁 Files Overview

- **`js/universal-spinning-wheel.js`** - Main script that handles the modal logic
- **`spinning-wheel-standalone.html`** - Your existing spinning wheel (unchanged)
- **`spinning-wheel-integration-example.html`** - Demo page showing integration
- **`spinning-wheel-modal.html`** - Standalone demo modal (for testing)

## ⚙️ How It Works

1. **Timer Tracking**: Starts counting when the page loads
2. **5-Minute Trigger**: Automatically shows modal after 5 minutes
3. **Daily Limit**: Uses localStorage to ensure users only see it once per day
4. **Seamless Integration**: Loads your existing spinning wheel in an iframe
5. **User Control**: Can be closed by clicking outside, pressing Escape, or clicking X

## 🎨 Features

- ✅ **Automatic Timing**: Appears after 5 minutes
- ✅ **Daily Limits**: Only once per day per user
- ✅ **Responsive Design**: Works on mobile and desktop
- ✅ **Smooth Animations**: Fade-in and slide-in effects
- ✅ **Backdrop Blur**: Modern glass-morphism effect
- ✅ **Keyboard Support**: Escape key to close
- ✅ **Click Outside**: Click outside modal to close
- ✅ **Body Scroll Lock**: Prevents background scrolling
- ✅ **Cross-Page Persistence**: Timer continues across page navigation

## 🔧 Customization

### Change Timing
Modify the `TRIGGER_DELAY` in the script:

```javascript
const CONFIG = {
    TRIGGER_DELAY: 3 * 60 * 1000, // 3 minutes instead of 5
    // ... other config
};
```

### Change Storage Key
```javascript
const CONFIG = {
    STORAGE_KEY: 'myCustomWheelKey',
    // ... other config
};
```

### Change Modal ID
```javascript
const CONFIG = {
    MODAL_ID: 'myCustomModalId',
    // ... other config
};
```

## 🎮 Manual Control

You can manually control the modal using these global functions:

```javascript
// Show modal immediately
window.showSpinningWheelModal();

// Close modal
window.closeSpinningWheelModal();
```

## 📱 Responsive Behavior

- **Desktop**: Full-size modal with backdrop blur
- **Mobile**: Responsive sizing with touch-friendly close button
- **Tablet**: Optimized for medium screens

## 🔒 Security & Privacy

- Uses localStorage for daily limits (client-side only)
- No external tracking or analytics
- Respects user privacy
- Graceful fallback if localStorage is disabled

## 🧪 Testing

### Test the Modal
1. Open `spinning-wheel-integration-example.html`
2. Wait 5 minutes, or use the "Show Modal Now" button
3. Test closing with Escape key, clicking outside, or X button

### Reset Daily Limit
Use the "Reset Daily Limit" button to test the daily restriction functionality.

### Cross-Page Testing
Navigate between pages to see how the timer persists across navigation.

## 🚨 Troubleshooting

### Modal Not Appearing
- Check browser console for errors
- Verify the script is loaded correctly
- Check if user has already seen it today
- Ensure localStorage is enabled

### Styling Issues
- Check if your CSS conflicts with modal styles
- Verify z-index is high enough (default: 9999)
- Check for conflicting modal systems

### Performance Issues
- The script is lightweight and shouldn't impact performance
- Timer uses setTimeout, not setInterval
- Modal is only created when needed

## 🔄 Integration Examples

### Basic Integration
```html
<!DOCTYPE html>
<html>
<head>
    <title>My Website</title>
</head>
<body>
    <!-- Your website content -->
    
    <!-- Include the spinning wheel trigger -->
    <script src="js/universal-spinning-wheel.js"></script>
</body>
</html>
```

### With Custom Configuration
```html
<script src="js/universal-spinning-wheel.js"></script>
<script>
    // Override default configuration
    window.addEventListener('DOMContentLoaded', function() {
        // Custom timing (3 minutes)
        const script = document.querySelector('script[src*="universal-spinning-wheel.js"]');
        if (script) {
            script.onload = function() {
                // Access the CONFIG object and modify if needed
                console.log('Spinning wheel modal loaded');
            };
        }
    });
</script>
```

### Manual Trigger
```html
<button onclick="window.showSpinningWheelModal()">
    Show Special Offer
</button>
```

## 📊 Analytics & Tracking

The system automatically tracks:
- When users see the modal
- Daily limits per user
- Modal interactions (open/close)

You can extend this by adding your own analytics in the event handlers.

## 🎯 Best Practices

1. **Timing**: 5 minutes is optimal - not too early, not too late
2. **Frequency**: Daily limits prevent user fatigue
3. **Placement**: Include on high-traffic pages
4. **Testing**: Test on different devices and browsers
5. **Content**: Ensure the spinning wheel offers real value

## 🔮 Future Enhancements

Potential improvements you could add:
- A/B testing different timing
- User preference settings
- Integration with analytics platforms
- Custom trigger conditions (scroll depth, page views, etc.)
- Seasonal or promotional variations

## 📞 Support

This system is designed to be self-contained and easy to integrate. If you need help:
1. Check the browser console for errors
2. Verify all files are in the correct locations
3. Test with the example page first
4. Ensure your spinning wheel HTML is working independently

---

**Happy spinning! 🎡**
