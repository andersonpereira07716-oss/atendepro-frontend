import 'dotenv/config';
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } from '@whiskeysockets/baileys';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

const PHONE_NUMBER = '5583998765554';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const geminiApiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: geminiApiKey });
const MODEL_NAME = 'gemini-2.5-flash';

async function startWhatsAppBot() {
  if (fs.existsSync('auth_info_baileys')) {
    fs.rmSync('auth_info_baileys', { recursive: true, force: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

  const { version } = await fetchLatestBaileysVersion();
  console.log(`ℹ️ A utilizar a versão do WhatsApp v${version.join('.')}`);

  const sock = makeWASocket({
    auth: state,
    version,
    printQRInTerminal: false,
    markOnlineOnConnect: true,
    browser: Browsers.macOS('Desktop')
  });

  sock.ev.on('creds.update', saveCreds);

  let requested = false;

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      console.log('\n✅ WhatsApp conectado com sucesso e pronto a atender!\n');
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = reason !== DisconnectReason.loggedOut;
      console.log(`⚠️ Conexão fechada (Código: ${reason}). A reiniciar...`);
      if (shouldReconnect) {
        setTimeout(startWhatsAppBot, 3000);
      }
    }

    if (connection === 'open' && !sock.authState.creds.registered && !requested) {
      requested = true;
      setTimeout(async () => {
        try {
          console.log(`\n⏳ A solicitar um novo código de 8 dígitos para ${PHONE_NUMBER}...`);
          const code = await sock.requestPairingCode(PHONE_NUMBER);
          const formatted = code?.match(/.{1,4}/g)?.join('-') || code;
          console.log(`\n========================================`);
          console.log(`🔑 NOVO CÓDIGO DE PAREAMENTO: ${formatted}`);
          console.log(`========================================\n`);
        } catch (err) {
          console.error('❌ Erro ao gerar o código:', err);
          requested = false;
        }
      }, 3000);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const senderPhone = msg.key.remoteJid;
      const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text;

      if (!messageText) continue;

      console.log(`📩 Mensagem de ${senderPhone}: ${messageText}`);

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
Usa a base de conhecimento: ${knowledgeBase} para responder de forma concisa.`;

        let aiResponse;
        try {
          aiResponse = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: [{ role: 'user', parts: [{ text: systemPrompt + "\n\nMensagem: " + messageText }] }]
          });
        } catch (err) {
          aiResponse = { text: `Olá! Obrigado pelo contacto com a ${businessName}.` };
        }

        const replyText = aiResponse.text || `Olá!`;
        await sock.sendMessage(senderPhone, { text: replyText });
        console.log(`🤖 Resposta enviada: ${replyText}`);
      } catch (err) {
        console.error('❌ Erro na mensagem:', err);
      }
    }
  });
}

startWhatsAppBot();
