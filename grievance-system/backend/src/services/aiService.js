const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-opus-4-5';

async function generateResponse(grievance) {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are a professional customer service manager. Write a warm, empathetic, specific 2-3 paragraph email response to this customer grievance. Start with "Dear ${grievance.customer_name},". Acknowledge the issue specifically, apologise sincerely, explain the resolution steps, and give a clear timeline.\n\nGrievance: ${JSON.stringify(grievance)}`,
    }],
  });
  return message.content[0].text;
}

async function classifyGrievance(description) {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: `Classify this civic/public grievance complaint. Return ONLY valid JSON with keys:
- category (one of: Water, Road, Electricity, Garbage, Sanitation, Delivery, Refund, Product Quality, Customer Service, Billing, Technical, Other)
- priority (low/medium/high/critical) — base on urgency keywords: angry/dangerous/emergency = critical/high, inconvenient = medium, minor = low
- sentiment (positive/neutral/frustrated/angry/urgent)

Complaint: ${description}`,
    }],
  });
  const text = message.content[0].text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid AI classification response');
  return JSON.parse(jsonMatch[0]);
}

async function generateSummary(grievances) {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Analyze these recent customer grievances and provide a 3-bullet executive summary of key trends, top issues, and recommended actions. Be concise and actionable.\n\nGrievances: ${JSON.stringify(grievances.slice(0, 20))}`,
    }],
  });
  return message.content[0].text;
}

module.exports = { generateResponse, classifyGrievance, generateSummary };
