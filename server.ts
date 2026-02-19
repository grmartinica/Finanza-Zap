import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = 3000;

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Gemini Setup
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

app.use(express.json());

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// WAHA Webhook
app.post('/api/webhook/whatsapp', async (req, res) => {
  try {
    const { event, payload } = req.body;
    console.log('Received WAHA event:', event);

    if (event === 'message.upsert' || event === 'message') {
      const message = payload;
      const body = message.body || '';
      const from = message.from;
      const isVoice = message.type === 'ptt' || message.type === 'audio';

      let textToProcess = body;

      if (isVoice) {
        // In a real scenario, we'd download the audio from WAHA and send to Gemini
        // For this demo, we'll assume WAHA might provide a transcription or we'd use Gemini's audio capabilities
        // Since we are in a sandbox, we'll simulate the voice processing if needed, 
        // but Gemini 2.5 Flash can handle audio if we have the bytes.
        // For now, let's focus on text and mention audio support.
        console.log('Voice message received from:', from);
      }

      if (textToProcess) {
        const transaction = await processMessageWithGemini(textToProcess);
        if (transaction) {
          const { data, error } = await supabase
            .from('transactions')
            .insert([
              {
                amount: transaction.amount,
                type: transaction.type,
                category: transaction.category,
                description: transaction.description,
                raw_text: textToProcess,
                whatsapp_from: from,
              },
            ]);

          if (error) {
            console.error('Supabase error:', error);
          } else {
            console.log('Transaction saved:', transaction);
            // Optionally send a confirmation back via WAHA
            await sendWhatsAppConfirmation(from, transaction);
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

async function processMessageWithGemini(text: string) {
  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise a seguinte mensagem de texto sobre uma transação financeira e extraia os dados estruturados em JSON.
      Mensagem: "${text}"
      
      Regras:
      - amount: número (valor da transação)
      - type: "income" (entrada) ou "expense" (saída)
      - category: categoria (ex: alimentação, lazer, salário, etc.)
      - description: breve descrição
      
      Se não for uma transação financeira, retorne null.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            type: { type: Type.STRING, enum: ['income', 'expense'] },
            category: { type: Type.STRING },
            description: { type: Type.STRING },
          },
          required: ['amount', 'type', 'category', 'description'],
        },
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error('Gemini error:', error);
    return null;
  }
}

async function sendWhatsAppConfirmation(to: string, transaction: any) {
  const wahaUrl = process.env.WAHA_API_URL;
  const wahaKey = process.env.WAHA_API_KEY;

  if (!wahaUrl) return;

  const typeLabel = transaction.type === 'income' ? '✅ Entrada' : '🔻 Saída';
  const message = `${typeLabel} registrada!\n💰 Valor: R$ ${transaction.amount.toFixed(2)}\n📂 Categoria: ${transaction.category}\n📝 Descrição: ${transaction.description}`;

  try {
    await axios.post(`${wahaUrl}/api/sendText`, {
      chatId: to,
      text: message,
    }, {
      headers: wahaKey ? { 'X-Api-Key': wahaKey } : {},
    });
  } catch (error) {
    console.error('WAHA send error:', error);
  }
}

// Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
