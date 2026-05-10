const mongoose = require('mongoose');

async function checkDb() {
  const username = encodeURIComponent('MONGO_DB_ADMIN');
  const password = encodeURIComponent('mMlccTbXIEi52B16');
  const dbName = encodeURIComponent('Edufusion-test');
  const uri = `mongodb+srv://${username}:${password}@cluster0.c60ctk1.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=Cluster0`;

  try {
    await mongoose.connect(uri);
    console.log('Connected to DB');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const Institute = mongoose.model('Institute', new mongoose.Schema({}, { strict: false }));
    const AcademicClass = mongoose.model('AcademicClass', new mongoose.Schema({}, { strict: false }));

    const bossUser = await User.findOne({ email: 'e2e_legend_v1@edu.com' });
    if (bossUser) {
      console.log('User Registered:', bossUser.email, 'ID:', bossUser._id, 'InstID:', bossUser.instituteId);
      const inst = await Institute.findById(bossUser.instituteId);
      console.log('Institute:', inst ? inst.name : 'NOT FOUND', 'Onboarded:', inst ? inst.isOnboarded : 'N/A');
      
      const classes = await AcademicClass.find({ instituteId: bossUser.instituteId });
      console.log('Classes Count:', classes.length);
      classes.forEach(c => console.log(' - Class:', c.name));
    } else {
      console.log('User e2e_final_boss_v1@edu.com NOT FOUND');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDb();
