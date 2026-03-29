const { generateResponse, classifyGrievance, generateSummary } = require('../services/aiService');
const { validateImage } = require('../services/cvValidationService');
const path = require('path');

const suggest = async (req, res, next) => {
  try {
    const { grievance } = req.body;
    if (!grievance) return res.status(400).json({ error: 'Grievance data required' });
    const response = await generateResponse(grievance);
    res.json({ response });
  } catch (err) { next(err); }
};

const classify = async (req, res, next) => {
  try {
    const { description } = req.body;
    if (!description) return res.status(400).json({ error: 'Description required' });
    const result = await classifyGrievance(description);
    res.json(result);
  } catch (err) { next(err); }
};

const analyze = async (req, res, next) => {
  try {
    const { description } = req.body;
    if (!description) return res.status(400).json({ error: 'Description required' });
    let category = 'General';
    let priority = 'medium';
    let sentiment = 'neutral';
    const text = description.toLowerCase();

    if (text.match(/water|leak|sewage|pipe/)) category = 'Water';
    else if (text.match(/road|street|pothole|traffic/)) category = 'Road';
    else if (text.match(/electric|power|voltage|line/)) category = 'Electricity';
    else if (text.match(/trash|garbage|sanitation|waste/)) category = 'Garbage';

    if (text.match(/emergency|urgent|immediately|asap|critical/)) priority = 'high';
    else if (text.match(/soon|important|major/)) priority = 'medium';
    else priority = 'low';

    if (text.match(/angry|outraged|furious|unacceptable|annoyed/)) sentiment = 'urgent';
    else if (text.match(/Worried|concerned|anxious/gi)) sentiment = 'normal';
    else sentiment = 'neutral';

    res.json({ category, priority, sentiment });
  } catch (err) { next(err); }
};

const summary = async (req, res, next) => {
  try {
    const { grievances } = req.body;
    if (!Array.isArray(grievances)) return res.status(400).json({ error: 'Grievances array required' });
    const result = await generateSummary(grievances);
    res.json({ summary: result });
  } catch (err) { next(err); }
};

/**
 * POST /api/ai/detect-issue — Real Computer Vision detection using MobileNetV2.
 *
 * Accepts either:
 *   - A file upload (multipart form with field 'image')
 *   - { imageUrl: "/uploads/filename.jpg" } in the JSON body
 *   - { description: "..." } for text-only fallback via LLM
 *
 * Returns: { type, priority, confidence, labels, aiPowered, cvValidation }
 */
const detectIssue = async (req, res, next) => {
  try {
    const { description, imageUrl } = req.body;

    let cvResult = null;

    // Try CV validation if an image path is provided
    if (imageUrl) {
      const filePath = path.resolve(
        path.join(__dirname, '../../', imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`)
      );
      cvResult = await validateImage(filePath);
    } else if (req.file) {
      const filePath = path.resolve(req.file.path);
      cvResult = await validateImage(filePath);
    }

    // Build response
    const detected = {
      type: 'General',
      priority: 'medium',
      confidence: 0,
      aiPowered: true,
      cvValidation: cvResult || null,
    };

    // Use CV results if available and relevant
    if (cvResult && cvResult.relevant) {
      const categoryMap = {
        road: 'Road Damage',
        water: 'Water Supply',
        electricity: 'Electricity',
        garbage: 'Sanitation',
        infrastructure: 'Infrastructure',
      };
      detected.type = categoryMap[cvResult.categoryMatch] || 'Other';
      detected.confidence = cvResult.confidence;
      detected.labels = cvResult.labels;

      // Set priority based on CV confidence
      if (cvResult.confidence >= 0.8) detected.priority = 'high';
      else if (cvResult.confidence >= 0.5) detected.priority = 'medium';
      else detected.priority = 'low';
    }

    // Augment with LLM text classification if description is provided
    if (description) {
      try {
        const classified = await classifyGrievance(description);
        // Only override type from CV if no CV result
        if (!cvResult || !cvResult.relevant) {
          detected.type = classified.category || detected.type;
        }
        detected.priority = classified.priority || detected.priority;
        detected.sentiment = classified.sentiment;
      } catch {
        // LLM fallback silently fails
      }
    }

    // Flag low-confidence results
    if (detected.confidence < 0.5 && cvResult) {
      detected.verificationRequired = true;
      detected.verificationMessage = 'Image confidence is low. Please upload a clearer photo for accurate detection.';
    }

    res.json(detected);
  } catch (err) { next(err); }
};

// POST /api/ai/summarize — structured complaint summary
const summarize = async (req, res, next) => {
  try {
    const { description, category, priority } = req.body;
    if (!description) return res.status(400).json({ error: 'Description required' });
    const summaryText = `Issue Type: ${category || 'General'}\nPriority: ${priority || 'Medium'}\nSummary: ${description.slice(0, 200)}${description.length > 200 ? '...' : ''}\nRecommended Action: Route to relevant department for immediate review.`;
    res.json({ summary: summaryText, structured: { category, priority, keyPoints: [description.slice(0, 80)] } });
  } catch (err) { next(err); }
};

module.exports = { suggest, classify, analyze, summary, detectIssue, summarize };
