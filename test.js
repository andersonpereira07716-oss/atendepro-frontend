import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testarAssistente() {
  console.log("🤖 A testar a resposta da IA...");

  const systemInstruction = "És o assistente virtual da Assistência TecMaster, uma oficina de reparação de telemóveis e eletrónicos.";
  const mensagemTeste = "Olá! O meu telemóvel caiu e partiu o ecrã. Quanto custa para arranjar?";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ role: 'user', parts: [{ text: mensagemTeste }] }],
      config: { systemInstruction },
    });

    console.log("\n--- Resposta da IA ---");
    console.log(response.text);
    console.log("----------------------\n");

    // Testar gravação no Supabase
    const { error } = await supabase.from('chat_history').insert([
      { remote_jid: 'teste_terminal', role: 'user', content: mensagemTeste },
      { remote_jid: 'teste_terminal', role: 'model', content: response.text }
    ]);

    if (error) {
      console.error("❌ Erro ao gravar no Supabase:", error.message);
    } else {
      console.log("✅ Histórico guardado com sucesso no Supabase!");
    }

  } catch (err) {
    console.error("❌ Erro no teste:", err);
  }
}

testarAssistente();
