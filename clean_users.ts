import mongoose from 'mongoose';
import { buildMongoUri } from './src/config/db';
import * as dotenv from 'dotenv';
dotenv.config();

const cleanUp = async () => {
  try {
    const uri = buildMongoUri();
    await mongoose.connect(uri);
    console.log('Connected to DB');
    
    // We can interact with the 'USERS' collection directly to remove students
    const db = mongoose.connection.db;
    const usersCollection = db.collection('USERS');
    
    const result = await usersCollection.deleteMany({ role: 'student' });
    console.log(`Deleted ${result.deletedCount} orphaned student users.`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

cleanUp();
