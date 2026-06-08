const mongoose = require('mongoose');
require('dotenv').config();

const buildMongoUri = () => {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  if (process.env.DB_URI) return process.env.DB_URI;
  const username = process.env.DB_USERNAME;
  const password = process.env.DB_PASS;
  const dbName = process.env.DB_NAME;
  return `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@cluster0.c60ctk1.mongodb.net/${encodeURIComponent(dbName)}?retryWrites=true&w=majority&appName=Cluster0`;
};

exports.run = async function(mongoose, db) {
  const classesCol = db.collection('ACADEMIC_CLASSES');
  
  const classes = await classesCol.find({}).sort({ createdAt: 1 }).toArray();
  
  const byInstitute = {};
  for (const cls of classes) {
    const instId = cls.instituteId.toString();
    if (!byInstitute[instId]) byInstitute[instId] = [];
    byInstitute[instId].push(cls);
  }
  
  let updatedCount = 0;
  
  for (const instId of Object.keys(byInstitute)) {
    let currentCode = 1;
    for (const cls of byInstitute[instId]) {
      const updateData = {};
      let needsUpdate = false;
      
      if (!cls.classCode) {
        updateData.classCode = currentCode;
        needsUpdate = true;
      }
      if (cls.monthlyFee === undefined || cls.monthlyFee === null) {
        updateData.monthlyFee = 0;
        needsUpdate = true;
      }
      if (cls.admissionFee === undefined || cls.admissionFee === null) {
        updateData.admissionFee = 0;
        needsUpdate = true;
      }
      
      
      if (needsUpdate) {
        await classesCol.updateOne({ _id: cls._id }, { $set: updateData });
        updatedCount++;
        console.log(`Updated class ${cls.name} with ${JSON.stringify(updateData)}`);
      }
      currentCode++;
    }
  }
  
  console.log(`Migration 01 complete! Updated ${updatedCount} classes.`);
};
