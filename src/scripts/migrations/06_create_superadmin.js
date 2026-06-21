const bcrypt = require('bcryptjs');

exports.run = async function(mongoose, db) {
  const usersCol = db.collection('USERS');

  const email = 'shahin_superaadmin@edufusion.com';
  const existingUser = await usersCol.findOne({ email });

  if (existingUser) {
    console.log(`Superadmin user ${email} already exists. Skipping.`);
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Edufusion123', salt);

  const superAdmin = {
    email: email,
    passwordHash: passwordHash,
    name: 'Super Admin',
    role: 'super_admin',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await usersCol.insertOne(superAdmin);
  console.log(`Inserted superadmin user with ID: ${result.insertedId}`);

  console.log(`Migration 06 complete!`);
};
