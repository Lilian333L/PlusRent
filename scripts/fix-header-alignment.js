const fs = require('fs');
const path = require('path');

// List of main pages to update
const mainPages = [
    'public/index.html',
    'public/cars.html',
    'public/car-single.html',
    'public/about.html',
    'public/contact.html',
    'public/sober-driver.html',
    'public/booking.html',
    'public/login.html',
    'public/register.html',
    'public/account-dashboard.html',
    'public/account-profile.html',
    'public/account-booking.html',
    'public/account-favorite.html'
];

function fixHeaderAlignment(filePath) {
    try {
        console.log(`Processing: ${filePath}`);
        
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Find the menu-btn
        const menuBtnPattern = /(\s*<div id="menu-btn">\s*<span><\/span>\s*<span><\/span>\s*<span><\/span>\s*<\/div>)/;
        const menuBtnMatch = content.match(menuBtnPattern);
        
        if (!menuBtnMatch) {
            console.log(`  ⚠️  Could not find menu-btn in ${filePath}`);
            return false;
        }
        
        // Find the logo div and its parent structure
        const logoDivPattern = /<div id="logo">[\s\S]*?<\/div>/;
        const logoDivMatch = content.match(logoDivPattern);
        
        if (!logoDivMatch) {
            console.log(`  ⚠️  Could not find logo div in ${filePath}`);
            return false;
        }
        
        console.log(`  Found logo div and menu-btn`);
        
        // Find the position of the logo div
        const logoDivIndex = content.indexOf(logoDivMatch[0]);
        if (logoDivIndex === -1) {
            console.log(`  ⚠️  Could not locate logo div position in ${filePath}`);
            return false;
        }
        
        // Find the end of the logo div (including its closing tag)
        const logoDivEndIndex = logoDivIndex + logoDivMatch[0].length;
        
        // Find the end of the inner de-flex-col that contains the logo
        let innerColEndIndex = logoDivEndIndex;
        let divCount = 0;
        let found = false;
        
        // Look for the closing div that matches the logo's inner container
        for (let i = logoDivEndIndex; i < content.length; i++) {
            if (content.substring(i, i + 6) === '</div>') {
                divCount++;
                if (divCount === 1) { // We need to close the inner de-flex-col
                    innerColEndIndex = i + 6;
                    found = true;
                    break;
                }
            }
        }
        
        if (!found) {
            console.log(`  ⚠️  Could not find inner container end in ${filePath}`);
            return false;
        }
        
        // Remove the menu-btn from its current location
        content = content.replace(menuBtnMatch[1], '');
        
        // Insert the menu-btn after the logo's inner container (as a sibling)
        const beforeInsert = content.substring(0, innerColEndIndex);
        const afterInsert = content.substring(innerColEndIndex);
        content = beforeInsert + menuBtnMatch[1] + afterInsert;
        
        // Write the updated content back to the file
        fs.writeFileSync(filePath, content, 'utf8');
        
        console.log(`  ✅ Fixed header alignment in ${filePath}`);
        return true;
        
    } catch (error) {
        console.error(`  ❌ Error processing ${filePath}:`, error.message);
        return false;
    }
}

function main() {
    console.log('🚀 Starting header alignment fix across all pages...\n');
    
    let successCount = 0;
    let totalCount = mainPages.length;
    
    for (const page of mainPages) {
        if (fs.existsSync(page)) {
            if (fixHeaderAlignment(page)) {
                successCount++;
            }
        } else {
            console.log(`⚠️  File not found: ${page}`);
        }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`  Total pages processed: ${totalCount}`);
    console.log(`  Successfully updated: ${successCount}`);
    console.log(`  Failed: ${totalCount - successCount}`);
    
    if (successCount === totalCount) {
        console.log('\n🎉 All pages aligned successfully!');
    } else {
        console.log('\n⚠️  Some pages failed to update. Check the logs above.');
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { fixHeaderAlignment, mainPages }; 