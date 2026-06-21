const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await mongoose.connection.db.collection('USERS').findOne({ email: 'shahinkhan5175@gmail.com' });
  console.log("User:", user);
  if (user && user.instituteId) {
    const sub = await mongoose.connection.db.collection('institutesubscriptions').findOne({ instituteId: user.instituteId });
    console.log("Subscription:", sub);
    const trans = await mongoose.connection.db.collection('billingtransactions').find({ instituteId: user.instituteId }).toArray();
    console.log("Transactions:", trans);
  }
  process.exit(0);
}
run();
