const express = require('express');
const axios = require('axios');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Configure multer for PDF uploads
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Helper function to call Groq API
async function callGroqAPI(messages) {
  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-70b-versatile',
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Groq API Error:', error.response?.data || error.message);
    throw new Error('Failed to get response from AI assistant');
  }
}

// POST /api/chatbot/ask - Chat with AI assistant
router.post('/ask', authenticate, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message is required and must be a non-empty string'
      });
    }

    const messages = [{ role: 'user', content: message }];
    const response = await callGroqAPI(messages);

    res.json({
      success: true,
      message: response
    });
  } catch (error) {
    console.error('Chatbot ask error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process chat request'
    });
  }
});

// POST /api/chatbot/summarize - Upload PDF and get summary
router.post('/summarize', authenticate, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'PDF file is required'
      });
    }

    // Extract text from PDF
    const pdfData = await pdfParse(req.file.buffer);
    const pdfText = pdfData.text;

    if (!pdfText || pdfText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Could not extract text from PDF'
      });
    }

    // Create summary prompt
    const summaryPrompt = `Please provide a comprehensive summary of the following document text. Include the main topics, key points, and important details:

${pdfText.substring(0, 10000)}`; // Limit text to avoid token limits

    const messages = [{ role: 'user', content: summaryPrompt }];
    const summary = await callGroqAPI(messages);

    res.json({
      success: true,
      summary: summary,
      fileName: req.file.originalname,
      textLength: pdfText.length
    });
  } catch (error) {
    console.error('PDF summarize error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process PDF summary'
    });
  }
});

module.exports = router;
