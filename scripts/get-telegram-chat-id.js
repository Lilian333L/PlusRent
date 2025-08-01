require('dotenv').config();

console.log('🔧 Telegram Chat ID Helper');
console.log('========================');
console.log('');

console.log('📋 How to get your Telegram Chat ID:');
console.log('');
console.log('1. 🚀 Start a conversation with your bot:');
console.log('   • Open Telegram');
console.log('   • Search for your bot username');
console.log('   • Send /start to the bot');
console.log('');
console.log('2. 🔍 Get your Chat ID:');
console.log('   • Send /start to @userinfobot');
console.log('   • It will reply with your chat ID');
console.log('   • Copy the "ID" number (not the username)');
console.log('');
console.log('3. 📝 Update your .env file:');
console.log('   • Add: TELEGRAM_CHAT_ID=your_chat_id_here');
console.log('   • Or for multiple users: TELEGRAM_CHAT_IDS=id1,id2,id3');
console.log('');
console.log('4. 🔄 Restart the server');
console.log('');

console.log('📱 For Group Testing:');
console.log('• Create a Telegram group');
console.log('• Add your bot to the group');
console.log('• Send a message in the group');
console.log('• Use @userinfobot to get the group chat ID (negative number)');
console.log('');

console.log('🎯 Current Bot Configuration:');
console.log(`Bot Token: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ Set' : '❌ Not set'}`);
console.log(`Chat ID: ${process.env.TELEGRAM_CHAT_ID ? '✅ Set' : '❌ Not set'}`);
console.log(`Multiple Chat IDs: ${process.env.TELEGRAM_CHAT_IDS ? '✅ Set' : '❌ Not set'}`);
console.log('');

if (process.env.TELEGRAM_CHAT_IDS) {
  const chatIds = process.env.TELEGRAM_CHAT_IDS.split(',').map(id => id.trim());
  console.log('📋 Configured Chat IDs:');
  chatIds.forEach((id, index) => {
    console.log(`  ${index + 1}. ${id}`);
  });
  console.log('');
}

console.log('💡 Tips:');
console.log('• Chat IDs are numbers (positive for users, negative for groups)');
console.log('• You can test with multiple users using TELEGRAM_CHAT_IDS=id1,id2,id3');
console.log('• Each person will receive notifications independently');
console.log('• Restart the server after changing .env file');
console.log(''); 