import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(express.json());

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Inicializar a API do Gemini com o modelo 1.5-flash (estável e sem erro 503)
const ai = new GoogleGenAI();
const MODEL_NAME = 'gemini-1.5-flash';

app.post('/webhook', async (req, res) => {
  const { phone, message } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ error: 'Parâmetros "phone" e "message" são obrigatórios.' });
  }

  console.log(`📩 Mensagem recebida de ${phone}: ${message}`);

  try {
    let businessName = 'AtendePro';
    let knowledgeBase = 'Assistente virtual para atendimento automatizado e suporte ao cliente.';

    try {
      const { data: config } = await supabase
        .from('business_config')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (config) {
        businessName = config.business_name || businessName;
        knowledgeBase = config.knowledge_base || knowledgeBase;
      }
    } catch (e) {}

    try {
      await supabase.from('whatsapp_messages').insert([
        { phone: phone, message: message, direction: 'incoming' }
      ]);
    } catch (e) {}

    const systemPrompt = `És o assistente virtual inteligente da empresa "${businessName}". 
Usa a seguinte base de conhecimento para responder aos clientes de forma prestativa, educada e concisa:
${knowledgeBase}

Responde diretamente à mensagem do cliente mantendo um tom profissional e prestativo.`;

    // Chamada limpa e direta à API do Gemini
    const aiResponse = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + "\n\nMensagem do cliente: " + message }] }
      ]
    });

    const replyText = aiResponse.text || `Olá! Obrigado por contactar a ${businessName}. Como podemos ajudar?`;

    try {
      await supabase.from('whatsapp_messages').insert([
        { phone: phone, message: replyText, direction: 'outgoing' }
      ]);
    } catch (e) {}

    console.log(`🤖 Resposta da IA enviada: ${replyText}`);
    return res.json({ success: true, reply: replyText });

  } catch (err) {
    console.error('❌ Erro detalhado ao processar mensagem com IA:', err);
    return res.status(500).json({ 
      error: 'Erro interno ao processar a mensagem.', 
      details: err.message 
    });
  }
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🤖 Servidor AtendePro AI com Gemini a correr na porta ${PORT}`);
});
