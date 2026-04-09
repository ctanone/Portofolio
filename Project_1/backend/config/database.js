const mongoose = require('mongoose');
const User = require('../models/User');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Atlas connected successfully!');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.warn('Continuing without database connection. Auth routes will fail until DB is reachable.');
  }
};

async function getUserByEmail(email) {
  return await User.findOne({ email });
}
async function getUserBytoken(token) {
    return await User.findOne({ token });
}
async function createUser(username, email, password) {
  return await User.create({ username, email, password, authProvider: 'local' });
}

async function createGoogleUser(username, email, googleId) {
  return await User.create({
    username,
    email,
    googleId,
    authProvider: 'google',
  });
}

async function getUsersfromDatabase() {
  return await User.find();
}

async function getUserFromDatabase(id) {
  return await User.findById(id);
}

async function deleteUser(id) {
  return await User.findByIdAndDelete(id);
}



module.exports = { 
  connectDB, 
  getUserByEmail, 
  createUser, 
  createGoogleUser,
  getUsersfromDatabase, 
  getUserFromDatabase, 
  deleteUser,
  getUserBytoken
};
