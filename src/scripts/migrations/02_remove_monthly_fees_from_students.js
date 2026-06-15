exports.run = async function(mongoose, db) {
  const studentsCol = db.collection('STUDENTS');
  
  const result = await studentsCol.updateMany(
    { monthlyFees: { $exists: true } },
    { $unset: { monthlyFees: "" } }
  );
  
  console.log(`Migration 02 complete! Unset monthlyFees from ${result.modifiedCount} students.`);
};
