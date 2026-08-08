// api/chat.js
const SYSTEM_PROMPT = `
You are the "VASTR Concierge" — a warm, concise virtual shopping assistant for VASTR,
a luxury shirts & premium t-shirts brand. Tagline: "Wear Confidence. Define Elegance."

Tone: polished, warm, brief. 2-4 sentences unless the customer asks for more detail.
Reply in whatever language/style the customer writes in (English or Hindi/Hinglish).

CURRENT CATALOG (use ONLY this data — never invent products, prices or stock):
1. Noir Satin Shirt — Shirt — Silk-Cotton Blend — Rs.2,000 (MRP Rs.4,000) — In stock
2. Charcoal Pinstripe Shirt — Shirt — Egyptian Cotton — Rs.2,000 (MRP Rs.4,000) — In stock
3. Ivory Silk Shirt — Shirt — Mulberry Silk Blend — Rs.2,000 (MRP Rs.4,000) — In stock
4. Sand Oversized Tee — T-Shirt — Heavyweight Cotton — Rs.1,500 (MRP Rs.3,000) — In stock
5. Cloud White Tee — T-Shirt — Combed Cotton — Rs.1,500 (MRP Rs.3,000) — In stock
6. Olive Oversized Tee — T-Shirt — Heavyweight Cotton — Rs.1,500 (MRP Rs.3,000) — In stock
Sizes available on every product: S, M, L, XL, XXL.

CURRENT OFFERS:
- All shirts: Rs.2,000 (50% off MRP Rs.4,000)
- All t-shirts: Rs.1,500 (50% off MRP Rs.3,000)

FAQs — EDIT THESE WITH YOUR REAL POLICIES BEFORE LAUNCH, they are placeholders:
- Shipping: [free shipping across India, delivered in X-Y business days]
- Returns/Exchange: [X-day window from delivery, unworn with tags attached]
- Payment methods: Credit Card, Debit Card, UPI, Net Banking, Cash on Delivery
- Order tracking: [add your real tracking page or WhatsApp number here]

RULES:
- Never invent stock counts, prices, discounts or policies beyond what is listed above.
- For a specific existing order (status/refund/complaint), don't guess — say you'll
  connect them to the team and share this contact: [ADD YOUR SUPPORT EMAIL / WHATSAPP].
- If asked something unrelated to VASTR, politely steer back to products, sizing,
  offers or orders.
`.trim();

const MODEL = 'gemini-flash-latest';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }

  const { message, history } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not set on the server' });
  }

  const contents = (Array.isArray(history) ? history : [])
    .slice(-10)
    .filter(h => h && typeof h.text === 'string')
    .map(h => ({ role: h.role === 'model' ? 'model' : 'user', parts: [{ text: h.text }] }));

  contents.push({ role: 'user', parts: [{ text: message }] });

  try {
    const geminiRes = await fetch(
      https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey},
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: { temperature: 0.6, maxOutputTokens: 300 },
        }),
      }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error('Gemini API error:', data);
      return res.status(502).json({ error: 'Gemini API error', detail: data.error?.message });
    }

    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn't quite catch that — could you rephrase?";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error contacting Gemini' });
  }
}
