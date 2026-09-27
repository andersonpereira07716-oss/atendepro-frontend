import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Função com sistema de retry automático para contornar picos de tráfego (erro 503)
async function gerarRespostaComRetry(contents, systemInstruction, maxTentativas = 3) {
  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: contents,
        config: { systemInstruction },
      });
      return response.text;
    } catch (err) {
      console.warn(`⚠️ Tentativa ${tentativa} falhou (${err.message}). A tentar novamente em 3s...`);
      if (tentativa === maxTentativas) throw err;
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

async function iniciarBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('⚠️ Conexão fechada. A reconectar...', shouldReconnect);
      if (shouldReconnect) iniciarBot();
    } else if (connection === 'open') {
      console.log('✅ Bot do WhatsApp conectado com sucesso!');
    }
  });

  // Escutar novas mensagens recebidas
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const remoteJid = msg.key.remoteJid;
    const mensagemTexto = msg.message.conversation || msg.message.extendedTextMessage?.text;

    if (!mensagemTexto) return;

    console.log(`📩 Mensagem recebida de ${remoteJid}: "${mensagemTexto}"`);

    try {
      // 1. Carregar configuração do Supabase em tempo real
      const { data: config, error } = await supabase
        .from('business_config')
        .select('*')
        .limit(1)
        .single();

      if (error || !config) {
        console.error('❌ Erro ao carregar config do Supabase');
        return;
      }

      const systemInstruction = `És o assistente virtual da empresa ${config.business_name}. Diretrizes e personalidade: ${config.ai_personality}`;

      // 2. Gerar resposta inteligente com o Gemini (utilizando o retry)
      console.log("🤖 A processar resposta com o Gemini...");
      const respostaIA = await gerarRespostaComRetry(mensagemTexto, systemInstruction);

      // 3. Enviar a resposta de volta para o WhatsApp do cliente
      await sock.sendMessage(remoteJid, { text: respostaIA });
      console.log(`🤖 Resposta enviada com sucesso para ${remoteJid}`);

    } catch (err) {
      console.error('❌ Erro permanente ao processar mensagem com IA:', err.message);
    }
  });
}

iniciarBot();
