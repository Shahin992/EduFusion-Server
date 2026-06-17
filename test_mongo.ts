import mongoose from 'mongoose';

async function test() {
  await mongoose.connect('mongodb://localhost:27017/edufusion_prod', { // assuming local db
  });

  const Fee = mongoose.model('Fee', new mongoose.Schema({}, { strict: false }), 'FEES');
  const now = new Date();
  
  const paymentDateFilter = { 
    paymentDate: { 
      $gte: new Date(now.getFullYear(), now.getMonth(), 1), 
      $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) 
    } 
  };

  try {
    const res = await Fee.aggregate([
      { $match: { amount: { $gt: 0 }, ...paymentDateFilter } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    console.log("FEE RES:", res);
  } catch (e) {
    console.error("FEE ERROR:", e);
  }
  
  const Expense = mongoose.model('Expense', new mongoose.Schema({}, { strict: false }), 'EXPENSES');
  const expenseDateFilter = { 
    date: { 
      $gte: new Date(now.getFullYear(), now.getMonth(), 1), 
      $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) 
    } 
  };

  try {
    const res2 = await Expense.aggregate([
      { $match: { ...expenseDateFilter } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    console.log("EXPENSE RES:", res2);
  } catch (e) {
    console.error("EXPENSE ERROR:", e);
  }
  
  process.exit(0);
}

test();
