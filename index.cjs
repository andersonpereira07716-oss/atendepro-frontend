const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { GoogleGenAI } = require('@google/genai');
const { createClient } = require('@supabase/supabase-js');
const pino = require('pino');

const ai = new GoogleGenAI({ apiKey: 'process.env.GOOGLE_API_KEY' });
const supabase = createClient('https://gnbvvdxxqipybarhwgwj.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduYnZ2ZHh4cWlweWJhcmh3Z3dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNTM0MjIsImV4cCI6MjEwNTgyOTQyMn0.lMpb7Ie2KXqfMfmR1CTZZWN4d3FXrZ7UyzxAqOxTiUg');

const mensagensProcessadas = new Set();

async function iniciarBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' })
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
      console.log('Conexão fechada. A tentar reconectar...');
      if (shouldReconnect) {
        iniciarBot();
      }
    } else if (connection === 'open') {
      console.log('Bot da Assistência TecMaster conectado com sucesso!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    const msg = messages[0];
    
    if (msg.key.fromMe) return;
    if (msg.key.remoteJid === 'status@broadcast') return;

    const messageId = msg.key.id;
    if (mensagensProcessadas.has(messageId)) return;
    mensagensProcessadas.add(messageId);
    setTimeout(() => mensagensProcessadas.delete(messageId), 60000);

    const remoteJid = msg.key.remoteJid;
    const textoMensagem = msg.message?.conversation || msg.message?.extendedTextMessage?.text;

    if (!textoMensagem) return;

    console.log(`Mensagem recebida de ${remoteJid}: ${textoMensagem}`);

    let respostaIA;
    let tentativas = 3;

    while (tentativas > 0) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              role: 'user',
              parts: [
                { text: "És o assistente técnico da Assistência TecMaster. Responde ao cliente sobre orçamentos e reparações de telemóveis." },
                { text: textoMensagem }
              ]
            }
          ]
        });
        respostaIA = response.text;
        break;
      } catch (error) {
        tentativas--;
        if (tentativas === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const respostaFinal = respostaIA;
    console.log('Resposta gerada e processada com sucesso.');

    await sock.sendMessage(remoteJid, { text: respostaFinal });

    await supabase.from('chat_history').insert([
      { remote_jid: remoteJid, role: 'user', message: textoMensagem },
      { remote_jid: remoteJid, role: 'model', message: respostaFinal }
    ]);
  });
}

iniciarBot();
