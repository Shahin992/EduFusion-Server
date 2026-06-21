exports.run = async function(mongoose, db) {
  const plansCol = db.collection('subscriptionplans'); // Mongoose typically lowercases and pluralizes

  const existingCount = await plansCol.countDocuments();
  if (existingCount > 0) {
    console.log('Subscription plans already exist. Skipping creation.');
    return;
  }

  const defaultPlans = [
    {
      name: 'Starter',
      priceMonthly: 1500,
      priceYearly: 15000,
      maxStudents: 300,
      features: ['Up to 300 Students', 'Basic Reporting', 'Email Support'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Professional',
      priceMonthly: 3000,
      priceYearly: 30000,
      maxStudents: 1000,
      features: ['Up to 1000 Students', 'Advanced Reporting', 'Priority Support', 'SMS Integration'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Enterprise',
      priceMonthly: 5000,
      priceYearly: 50000,
      maxStudents: 0, // 0 = unlimited
      features: ['Unlimited Students', 'Custom Domains', 'Dedicated Account Manager', 'Custom API Access'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const result = await plansCol.insertMany(defaultPlans);
  console.log(`Inserted ${result.insertedCount} default subscription plans.`);

  console.log(`Migration 05 complete!`);
};
