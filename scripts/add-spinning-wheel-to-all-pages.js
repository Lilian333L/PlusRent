/**
 * Script to automatically add spinning wheel to all HTML pages
 * Run this script to add the universal spinning wheel to your entire website
 */

const fs = require('fs');
const path = require('path');

// Configuration
const PUBLIC_DIR = path.join(__dirname, '../public');
const SCRIPT_TAG = '    <!-- Universal Spinning Wheel -->\n    <script src="js/universal-include.js"></script>\n\n';
const MASTER_SCRIPT_TAG = '    <!-- Master Include (Spinning Wheel + i18n) -->\n    <script src="js/master-include.js"></script>\n\n';

// Files to skip (don't add spinning wheel to these)
const SKIP_FILES = [
    'spinning-wheel-standalone.html',
    'spinning-wheel-modal.html',
    'spinning-wheel-integration-example.html',
    'spinning-wheel-management.html'
];

// Function to add script to a single HTML file
function addScriptToFile(filePath, useMasterInclude = false) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Check if script is already added
        if (content.includes('universal-include.js') || content.includes('master-include.js')) {
            console.log(`✅ ${path.basename(filePath)} - Script already exists`);
            return false;
        }
        
        // Find the closing </body> tag
        const bodyCloseIndex = content.lastIndexOf('</body>');
        if (bodyCloseIndex === -1) {
            console.log(`⚠️  ${path.basename(filePath)} - No </body> tag found, skipping`);
            return false;
        }
        
        // Insert script before </body>
        const scriptToAdd = useMasterInclude ? MASTER_SCRIPT_TAG : SCRIPT_TAG;
        content = content.slice(0, bodyCloseIndex) + scriptToAdd + content.slice(bodyCloseIndex);
        
        // Write back to file
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${path.basename(filePath)} - Script added successfully`);
        return true;
    } catch (error) {
        console.error(`❌ ${path.basename(filePath)} - Error: ${error.message}`);
        return false;
    }
}

// Function to process all HTML files
function processAllHtmlFiles(useMasterInclude = false) {
    console.log(`\n🚀 Starting to add spinning wheel to all HTML pages...`);
    console.log(`📁 Scanning directory: ${PUBLIC_DIR}\n`);
    
    let totalFiles = 0;
    let processedFiles = 0;
    let skippedFiles = 0;
    
    try {
        const files = fs.readdirSync(PUBLIC_DIR);
        
        for (const file of files) {
            if (file.endsWith('.html')) {
                totalFiles++;
                
                if (SKIP_FILES.includes(file)) {
                    console.log(`⏭️  ${file} - Skipped (spinning wheel page)`);
                    skippedFiles++;
                    continue;
                }
                
                const filePath = path.join(PUBLIC_DIR, file);
                if (addScriptToFile(filePath, useMasterInclude)) {
                    processedFiles++;
                }
            }
        }
        
        console.log(`\n📊 Summary:`);
        console.log(`   Total HTML files: ${totalFiles}`);
        console.log(`   Processed: ${processedFiles}`);
        console.log(`   Skipped: ${skippedFiles}`);
        console.log(`   Script type: ${useMasterInclude ? 'Master Include' : 'Universal Include'}`);
        
        if (processedFiles > 0) {
            console.log(`\n🎉 Successfully added spinning wheel to ${processedFiles} pages!`);
            console.log(`🌐 Your spinning wheel will now appear on your entire website after 5 seconds of browsing.`);
        }
        
    } catch (error) {
        console.error(`❌ Error reading directory: ${error.message}`);
    }
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    const useMasterInclude = args.includes('--master') || args.includes('-m');
    
    console.log('🎯 Car Rental Website - Spinning Wheel Auto-Installer');
    console.log('=====================================================');
    
    if (useMasterInclude) {
        console.log('🔧 Using Master Include (recommended for new sites)');
        console.log('   This will load spinning wheel + i18n + other common scripts');
    } else {
        console.log('🎲 Using Universal Include (lightweight)');
        console.log('   This will load only the spinning wheel functionality');
    }
    
    console.log('\n💡 Usage:');
    console.log('   node add-spinning-wheel-to-all-pages.js          # Universal Include');
    console.log('   node add-spinning-wheel-to-all-pages.js --master # Master Include');
    
    // Ask for confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    rl.question('\n🤔 Do you want to proceed? (y/N): ', (answer) => {
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            processAllHtmlFiles(useMasterInclude);
        } else {
            console.log('❌ Operation cancelled');
        }
        rl.close();
    });
}

module.exports = { addScriptToFile, processAllHtmlFiles };
