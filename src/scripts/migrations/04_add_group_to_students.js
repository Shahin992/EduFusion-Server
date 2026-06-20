exports.run = async function(mongoose, db) {
  const studentsCol = db.collection('STUDENTS');
  
  // Update Students to have 'General' group if missing
  const result = await studentsCol.updateMany(
    { group: { $exists: false } },
    { $set: { group: 'General' } }
  );
  console.log(`Updated ${result.modifiedCount} students to have a 'General' group.`);

  console.log(`Migration 04 complete!`);
};
