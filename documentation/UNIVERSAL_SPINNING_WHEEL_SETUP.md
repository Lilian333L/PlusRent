# Universal Spinning Wheel Setup

## Overview
This solution provides a **single script** that automatically injects the spinning wheel modal into **any page** on your website. No need to manually add the script to each individual HTML page.

## How It Works
1. **Universal Script**: `universal-spinning-wheel.js` automatically creates and injects the modal into any page
2. **Cross-Page Timer**: Tracks total time spent browsing across ALL pages, not just one page
3. **Smart Detection**: Automatically skips spinning wheel pages to avoid conflicts
4. **Responsive Design**: Adapts to all device sizes (desktop, tablet, mobile)
5. **Phone Validation**: Requires phone number before showing the wheel
6. **Database Integration**: Tracks phone numbers and manages coupons

## Quick Setup (Recommended)

### Option 1: Add to Main Layout/Header
Add this single line to your main layout file or header that's included on every page:

```html
<script src="js/universal-include.js"></script>
```

### Option 2: Add to Individual Pages
If you prefer to add it to specific pages, use this instead:

```html
<script src="js/universal-spinning-wheel.js"></script>
```

## Files Created

### 1. `public/js/universal-spinning-wheel.js`
- **Main script** that creates and manages the modal
- **Automatically injects** HTML and CSS into any page
- **Handles all functionality**: timing, phone validation, iframe communication
- **Responsive design** for all device sizes

### 2. `public/js/universal-include.js`
- **Lightweight loader** that dynamically loads the main script
- **Prevents duplicate loading** if script is already present
- **Error handling** for failed script loads

## Features

### ✅ Automatic Modal Injection
- Creates modal HTML and CSS dynamically
- No need to modify existing page HTML
- Works on any page automatically

### ✅ Cross-Page Timer System
- **Tracks total browsing time** across ALL pages on your website
- **No timer reset** when navigating between pages
- **Accumulates time** spent browsing different sections
- **Shows modal after 5 seconds total** of website usage
- **Smart page navigation handling** - timer continues across page changes

### ✅ Smart Page Detection
- Automatically skips pages with "spinning-wheel" in the URL
- Prevents conflicts with standalone spinning wheel pages

### ✅ Phone Number Validation
- Requires phone number before showing the wheel
- Stores phone number in localStorage
- Tracks phone numbers in database via API

### ✅ Responsive Design
- **Desktop**: Large modal with optimal spacing
- **Tablet**: Medium size with adjusted heights
- **Mobile**: Full-screen experience for small devices
- **iPhone 14 Pro Max**: Optimized for very small screens

### ✅ Database Integration
- Calls `/api/spinning-wheels/track-phone` to store phone numbers
- Integrates with existing coupon redemption system
- Uses same backend logic as account dashboard

### ✅ User Experience
- Shows only once per day per user
- Smooth animations and transitions
- Keyboard support (Escape to close)
- Click outside to close

## Configuration

The script is configured with these default settings:

```javascript
const CONFIG = {
    delay: 5 * 1000,        // 5 seconds for testing
    storageKey: 'spinningWheelLastSeen',
    modalId: 'universal-spinning-wheel-modal',
    iframeSrc: 'spinning-wheel-standalone.html',
    zIndex: 9999
};
```

### To Change the Delay
Edit the `delay` value in `universal-spinning-wheel.js`:
- **Testing**: `5 * 1000` (5 seconds)
- **Production**: `5 * 60 * 1000` (5 minutes)

## Implementation Examples

### For a PHP-based site with header.php:
```php
<!-- In header.php or main layout -->
<script src="js/universal-include.js"></script>
```

### For a static HTML site:
```html
<!-- Add to every page before </body> -->
<script src="js/universal-include.js"></script>
```

### For a modern framework (React, Vue, etc.):
```javascript
// Import in your main app component
import './js/universal-spinning-wheel.js';
```

## Testing

### Basic Testing
1. **Add the script** to any page
2. **Wait 5 seconds** (configurable)
3. **Modal appears** with phone input
4. **Enter phone number** to see the wheel
5. **Test on different devices** to verify responsiveness

### Cross-Page Timer Testing
1. **Visit any page** on your website
2. **Navigate to different pages** within 5 seconds
3. **Timer continues counting** across page navigation
4. **Modal appears after 5 seconds total** browsing time
5. **Use the test page**: `test-cross-page-timer.html` to see timer in action

### Timer Behavior Examples
- **User visits homepage** → Timer starts (0s)
- **User clicks "Cars" after 2 seconds** → Timer continues (2s)
- **User clicks "About" after 1 more second** → Timer continues (3s)
- **User stays on About page for 2 more seconds** → Modal appears! (5s total)

## Troubleshooting

### Modal doesn't appear:
- Check browser console for errors
- Verify script path is correct
- Ensure page doesn't contain "spinning-wheel" in URL

### Phone validation issues:
- Check if `/api/spinning-wheels/track-phone` endpoint exists
- Verify database connection
- Check browser localStorage

### Responsive issues:
- Test on actual devices (not just browser dev tools)
- Check CSS media queries in the script
- Verify iframe height calculations

## Benefits of This Approach

1. **Single Script**: One file to rule them all
2. **No Duplication**: No need to add script to each page
3. **Automatic**: Works on any page automatically
4. **Maintainable**: Update once, works everywhere
5. **Performance**: Lightweight and efficient
6. **Flexible**: Easy to customize and configure

## Next Steps

1. **Choose your implementation method** (Option 1 or 2)
2. **Add the script** to your main layout or specific pages
3. **Test the functionality** on different pages and devices
4. **Customize the delay** for production use
5. **Monitor user engagement** and adjust as needed

This solution gives you a **professional, responsive spinning wheel** that works across your entire website with minimal setup!
