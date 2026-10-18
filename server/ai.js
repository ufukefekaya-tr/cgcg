// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
import { ApiError, exactKeys, object } from './validation.js';

export function normalizeVisionRequest(body) {
  object(body); exactKeys(body, ['messages', 'image'], 'vision');
  if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 20) throw new ApiError(400, 'INVALID_INPUT', 'Supply 1 to 20 chat messages');
  let total = 0;
  const messages = body.messages.map(message => {
    object(message, 'Message'); exactKeys(message, ['role', 'content'], 'message');
    if (!['user', 'assistant'].includes(message.role) || typeof message.content !== 'string' || !message.content.trim()) throw new ApiError(400, 'INVALID_INPUT', 'Invalid message role or content');
    total += message.content.length;
    if (total > 16000) throw new ApiError(413, 'LIMIT_EXCEEDED', 'Chat text limit exceeded');
    return { role: message.role, content: message.content };
  });
  let image;
  if (body.image !== undefined) {
    object(body.image, 'Image'); exactKeys(body.image, ['mimeType', 'data'], 'image');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(body.image.mimeType) || typeof body.image.data !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/u.test(body.image.data) || !body.image.data || body.image.data.length > 700000) throw new ApiError(400, 'INVALID_INPUT', 'Use a bounded base64 PNG, JPEG or WebP image');
    image = { ...body.image };
  }
  return { messages, image };
}

export function createVisionProvider({ aiModel, aiApiKey }) {
  if (!aiModel || !aiApiKey) return null;
  return async ({ messages, image }) => {
    let GoogleGenAI;
    try { ({ GoogleGenAI } = await import('@google/genai')); }
    catch { throw new ApiError(503, 'AI_UNAVAILABLE', 'The optional Gemini dependency is unavailable'); }
    const client = new GoogleGenAI({ apiKey: aiApiKey, httpOptions: { timeout: 30000 } });
    const contents = messages.map(message => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] }));
    if (image) {
      const latest = [...contents].reverse().find(message => message.role === 'user');
      if (!latest) throw new ApiError(400, 'INVALID_INPUT', 'An image requires a user message');
      latest.parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
    }
    try {
      const response = await client.models.generateContent({
        model: aiModel, contents,
        config: { maxOutputTokens: 2048, systemInstruction: 'Explain editable CNC dispensing G-code drafts. Identify assumptions and uncertainty. Do not claim machine certification or execute or send code to hardware.' },
      });
      return { text: response.text || '', model: aiModel };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, 'AI_PROVIDER_ERROR', 'The configured AI provider request failed');
    }
  };
}
