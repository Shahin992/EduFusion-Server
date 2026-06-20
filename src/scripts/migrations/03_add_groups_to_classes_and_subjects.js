exports.run = async function(mongoose, db) {
  const classesCol = db.collection('ACADEMIC_CLASSES');
  const subjectsCol = db.collection('SUBJECTS');
  
  // 1. Update Classes to have an empty groups array if missing
  const classResult = await classesCol.updateMany(
    { groups: { $exists: false } },
    { $set: { groups: [] } }
  );
  console.log(`Updated ${classResult.modifiedCount} classes to have a groups array.`);

  // 2. Update Subjects to have 'General' group if missing
  const subjectResult = await subjectsCol.updateMany(
    { group: { $exists: false } },
    { $set: { group: 'General' } }
  );
  console.log(`Updated ${subjectResult.modifiedCount} subjects to have a 'General' group.`);

  console.log(`Migration 03 complete!`);
};
