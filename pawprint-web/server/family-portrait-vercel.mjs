import express from 'express';
import {createFamilyPortraitRouter} from './family-portrait.mjs';

const app = express();
app.disable('x-powered-by');
app.use('/api/family-portrait', createFamilyPortraitRouter({
  apiKey: process.env.OPENAI_PORTRAIT_API_KEY,
  clientFor: req => req.get('x-vercel-forwarded-for') ?? req.get('x-forwarded-for') ?? req.ip
}));

export default app;
