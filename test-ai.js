import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function executarTeste() {
  console.log("🔍 A carregar configuração do Supabase...");
  
  const { data: config, error } = await supabase
    .from('business_config')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error("❌ Erro ao carregar Supabase:", error.message);
    return;
  }

  console.log(`🏢 Negócio: ${config.business_name}`);
  console.log(`🧠 Personalidade carregada: ${config.ai_personality}\n`);

  const mensagemCliente = "Olá, o meu telemóvel não liga e está com o ecrã partido. Quanto custa arranjar?";
  console.log(`📩 Mensagem do Cliente: "${mensagemCliente}"`);
  console.log("🤖 A gerar resposta com o Gemini...");

  try {
        const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',

      contents: mensagemCliente,
      config: {
        systemInstruction: `És o assistente virtual da empresa ${config.business_name}. Diretrizes e personalidade: ${config.ai_personality}`,
      },
    });


    console.log("\n💬 Resposta gerada pela IA:");
    console.log("--------------------------------------------------");
    console.log(response.text);
    console.log("--------------------------------------------------");
  } catch (err) {
    console.error("❌ Erro na API do Gemini:", err.message);
  }
}

executarTeste();
