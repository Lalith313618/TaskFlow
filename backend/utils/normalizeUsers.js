const mongoose = require('mongoose');
require('dotenv').config();

async function normalizeUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // 1. Remove mock/test seed user if needed or keep real users
    // Remove the fake generated users: intern_1788543577727@example.com and manager_1788543577727@example.com
    const deleteResult = await mongoose.connection.db.collection('users').deleteMany({
      email: { $in: ['intern_1788543577727@example.com', 'manager_1788543577727@example.com'] }
    });
    console.log('Removed mock seed users:', deleteResult.deletedCount);

    // 2. Set role: 'intern' for all users who do not have a role or whose role is not 'manager'
    const updateResult = await mongoose.connection.db.collection('users').updateMany(
      {
        $or: [
          { role: { $exists: false } },
          { role: null },
          { role: '' },
          { role: { $nin: ['manager', 'intern'] } }
        ]
      },
      {
        $set: { role: 'intern' }
      }
    );
    console.log('Normalized users to role "intern":', updateResult.modifiedCount);

    // 3. Ensure manager@gmail.com is role 'manager'
    await mongoose.connection.db.collection('users').updateOne(
      { email: 'manager@gmail.com' },
      { $set: { role: 'manager' } }
    );

    // List all users to verify
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    console.log('\nCurrent User Directory:');
    users.forEach(u => console.log(`- ${u.name} (${u.email}) -> Role: ${u.role}`));

    process.exit(0);
  } catch (err) {
    console.error('Normalization error:', err);
    process.exit(1);
  }
}

normalizeUsers();
