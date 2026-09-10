require('dotenv').config();
const { sendTaskAssignedEmail } = require('./utils/emailService');

const targetEmail = process.argv[2] || process.env.EMAIL_USER;

if (!targetEmail) {
  console.log('Usage: node test-email.js <recipient-email>');
  console.log('Example: node test-email.js student@gmail.com');
  process.exit(1);
}

console.log('--------------------------------------------------');
console.log('Testing TaskFlow Email Service...');
console.log(`Sender (EMAIL_USER): ${process.env.EMAIL_USER || '(Not set)'}`);
console.log(`Recipient:           ${targetEmail}`);
console.log('--------------------------------------------------');

sendTaskAssignedEmail({
  toEmail: targetEmail,
  internName: 'Test User',
  taskTitle: 'Complete Onboarding & Setup Workspace',
  taskDescription: 'This is a test notification confirming that TaskFlow email integration is operational.',
  dueDate: new Date(Date.now() + 86400000 * 3), // 3 days from now
  priority: 'high',
  managerName: 'TaskFlow Admin'
}).then(result => {
  console.log('Result:', result);
  if (result && result.simulated) {
    console.log('\n⚠️ Email was SIMULATED because EMAIL_USER and EMAIL_PASS are not set in backend/.env.');
    console.log('Please add your EMAIL_USER and EMAIL_PASS to backend/.env to send real emails.');
  } else if (result && result.success) {
    console.log('\n🎉 SUCCESS! Real email dispatched successfully. Check the inbox (or spam folder) of:', targetEmail);
  } else {
    console.log('\n❌ Failed to send real email. Error details above.');
  }
}).catch(err => {
  console.error('Error occurred:', err);
});
