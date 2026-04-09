 const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
  password: {
    type: String,
      required: false,
  },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', userSchema);
