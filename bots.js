import 'dotenv/config';
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import qrcode from 'qrcode-terminal';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const geminiApiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: geminiApiKey });
const MODEL_NAME = 'gemini-2.5-flash';

async function startWhatsAppBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // Desativado para usar o gestor manual abaixo
    markOnlineOnConnect: true,
    browser: ['Ubuntu', 'Chrome', '22.04.4']
  });

  sock.ev.on('creds.update', saveCreds);

  // Capturar o QR Code gerado pelo Baileys e imprimi-lo no terminal
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📱 Escaneie o QR Code abaixo com o seu WhatsApp:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      console.log('\n✅ WhatsApp conectado com sucesso e pronto a atender!\n');
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('⚠️ Conexão fechada. A reconectar...', shouldReconnect);
      if (shouldReconnect) {
        startWhatsAppBot();
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const senderPhone = msg.key.remoteJid;
      const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text;

      if (!messageText) continue;

      console.log(`📩 Mensagem recebida de ${senderPhone}: ${messageText}`);

      try {
        let businessName = 'AtendePro';
        let knowledgeBase = 'Assistência técnica e suporte automatizado.';

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

        const systemPrompt = `És o assistente virtual da empresa "${businessName}". 
Usa a seguinte base de conhecimento para responder aos clientes de forma prestativa, educada e concisa:
${knowledgeBase}

Responde diretamente às mensagens mantendo um tom profissional.`;

        let aiResponse;
        try {
          aiResponse = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: [
              { role: 'user', parts: [{ text: systemPrompt + "\n\nMensagem do cliente: " + messageText }] }
            ]
          });
        } catch (err) {
          aiResponse = { text: `Olá! Obrigado pelo contacto com a ${businessName}. Como podemos ajudar com o seu suporte?` };
        }

        const replyText = aiResponse.text || `Olá! Obrigado por contactar a ${businessName}.`;

        await sock.sendMessage(senderPhone, { text: replyText });
        console.log(`🤖 Resposta enviada: ${replyText}`);

      } catch (err) {
        console.error('❌ Erro ao processar mensagem:', err);
      }
    }
  });
}

startWhatsAppBot();
