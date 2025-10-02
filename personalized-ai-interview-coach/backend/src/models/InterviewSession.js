const mongoose = require('mongoose');

const InterviewSessionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  score: { type: Number, required: true },
  feedback: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InterviewSession', InterviewSessionSchema);
