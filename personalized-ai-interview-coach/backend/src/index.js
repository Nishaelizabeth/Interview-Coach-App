require('dotenv').config(); // MUST be the first line

// --- Imports ---
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdf = require('pdf-parse');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const connectDB = require('./db');
const InterviewSession = require('./models/InterviewSession');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// --- Initialization ---
const app = express();
const port = process.env.PORT || 5000;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });


// Connect to MongoDB
connectDB();

// --- Middleware ---
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// --- API Endpoints ---
app.get('/', (req, res) => {
  res.send('AI Interview Coach Backend is running!');
});

// Get all interview sessions
app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await InterviewSession.find()
      .sort({ createdAt: -1 }) // Sort by most recent first
      .lean(); // Convert Mongoose documents to plain JavaScript objects
    
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch interview sessions',
      details: error.message 
    });
  }
});

// --- CORRECTED AI Question Generation Endpoint ---
app.post('/api/generate-question', async (req, res) => {
  const { topic } = req.body;
  if (!topic) {
    return res.status(400).json({ error: 'A topic is required.' });
  }

  try {
    // Create the prompt for the model
    const prompt = `Generate one single, concise interview question about ${topic}. Do not add any preamble or explanation.`;
    
    // Generate content using Google's Generative AI
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedText = await response.text();

    res.json({ question: generatedText.trim().replace(/^"/g, '').replace(/"$/g, '') });
  } catch (error) {
    console.error('Error calling Google Generative AI:', error);
    res.status(500).json({ error: 'Failed to generate question from AI.' });
  }
});

// New endpoint for evaluating answers
app.post('/api/evaluate-answer', async (req, res) => {
  try {
    const { question, answer } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer are required' });
    }

    const evaluationPrompt = `
      As an expert interview coach, please evaluate the following interview response.
      The question asked was: "${question}"
      The user's answer was: "${answer}"

      Provide your feedback in a JSON object with these exact keys:
      1. "score": A numerical score from 1 to 10, where 10 is excellent.
      2. "feedback": A brief, constructive paragraph (2-3 sentences) explaining the score and offering one tip for improvement.

      Your entire response must be only the JSON object, with no other text or explanation.
      {
        "score": 8,
        "feedback": "Your answer was clear and relevant, but could benefit from more specific examples to strengthen your response."
      }
    `;

    const result = await model.generateContent(evaluationPrompt);
    const jsonString = (await result.response).text();
    
    try {
      // Extract and parse the JSON response, handling potential markdown formatting
      const evaluation = JSON.parse(jsonString.match(/\{[\s\S]*\}/)[0]);
      
      // Save the interview session to the database
      try {
        const newSession = new InterviewSession({
          question: question,
          answer: answer,
          score: evaluation.score,
          feedback: evaluation.feedback
        });
        await newSession.save();
        console.log('Interview session saved to database.');
      } catch (dbError) {
        console.error('Failed to save session to database:', dbError);
        // We don't want to fail the request if database save fails
      }
      
      res.json(evaluation);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      res.status(500).json({ 
        error: 'Error parsing evaluation response',
        details: parseError.message 
      });
    }
  } catch (error) {
    console.error('Error in evaluation:', error);
    res.status(500).json({ 
      error: 'Error evaluating answer',
      details: error.message 
    });
  }
});

// Generate a follow-up question based on the user's previous answer
app.post('/api/generate-follow-up', async (req, res) => {
  const { originalQuestion, previousAnswer } = req.body;
  
  if (!originalQuestion || !previousAnswer) {
    return res.status(400).json({ 
      error: 'Both originalQuestion and previousAnswer are required.' 
    });
  }

  try {
    const followUpPrompt = `You are an expert interviewer. The user was just asked the following question:
"${originalQuestion}"

The user gave this answer:
"${previousAnswer}"
Based on their answer, ask one single, concise, and relevant follow-up question to dig deeper into their response.
Do not add any preamble, explanation, or quotation marks. Just provide the follow-up question itself.`;

    const result = await model.generateContent(followUpPrompt);
    let followUpQuestion = (await result.response).text().trim();
    
    // Clean up the response
    followUpQuestion = followUpQuestion
      .replace(/^["']|["']$/g, '')  // Remove surrounding quotes
      .replace(/^[\s\n]+|[\s\n]+$/g, '')  // Remove extra whitespace
      .replace(/^[^\w\s"']+/g, '')  // Remove any leading non-word characters
      .replace(/[^\w\s"']+$/g, ''); // Remove any trailing non-word characters
    
    // Ensure the question ends with a question mark
    if (!/[?\uFF1F]$/.test(followUpQuestion)) {
      followUpQuestion = followUpQuestion.replace(/[.,;:]$/, '') + '?';
    }
    
    res.json({ followUpQuestion });
  } catch (error) {
    console.error('Error generating follow-up question:', error);
    res.status(500).json({ 
      error: 'Failed to generate follow-up question',
      details: error.message 
    });
  }
});

// Generate questions from resume PDF
app.post('/api/generate-from-resume', upload.single('resume'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No resume file uploaded.' });
  }

  try {
    // Extract text from the PDF buffer
    const data = await pdf(req.file.buffer);
    const resumeText = data.text;

    // Craft the AI prompt
    const resumePrompt = `Based on the following resume text, generate 5 relevant and insightful interview questions that an interviewer might ask this candidate. Focus on their listed skills, projects, and work experience. Return the questions as a JSON array of strings.

Resume Text:
---
${resumeText}
---

Example JSON output: ["Can you tell me more about your role in Project X?", "How did you use Python at Company Y to achieve Z?"]`;

    const result = await model.generateContent(resumePrompt);
    const generatedText = (await result.response).text();
    
    // Parse the JSON array from the response
    let questions;
    try {
      questions = JSON.parse(generatedText.match(/\[[\s\S]*\]/)[0]);
      if (!Array.isArray(questions)) {
        throw new Error('Response is not an array');
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
      throw new Error('Failed to parse questions from AI response');
    }

    res.json({ questions });

  } catch (error) {
    console.error('Error processing resume:', error);
    res.status(500).json({ 
      error: 'Failed to process resume and generate questions.',
      details: error.message 
    });
  }
});

// Get all interview sessions
app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await InterviewSession.find()
      .sort({ createdAt: -1 }) // Sort by most recent first
      .lean(); // Convert Mongoose documents to plain JavaScript objects
    
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch interview sessions',
      details: error.message 
    });
  }
});

// --- Start Server ---
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});


