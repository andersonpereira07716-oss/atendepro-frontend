const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

// Inicializa o cliente do Supabase com as credenciais do seu projeto existente
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Inicializa a IA
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Rota de Teste do Servidor
app.get('/', (req, res) => {
  res.json({ status: 'AtendePro AI Backend rodando com sucesso!' });
});

// Rota principal do Chatbot Comercial com IA (Protegida por company_id)
app.post('/api/chat', async (req, res) => {
  try {
    const { company_id, message, history } = req.body;

    if (!company_id || !message) {
      return res.status(400).json({ error: 'company_id e message são obrigatórios.' });
    }

    // 1. Busca os dados e a base de conhecimento da empresa no Supabase
    const { data: company, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', company_id)
      .single();

    if (error || !company) {
      return res.status(404).json({ error: 'Empresa não encontrada.' });
    }

    // 2. Monta o Prompt de Segurança e Contexto da Empresa
    const systemPrompt = `
      Você é o atendente virtual comercial da empresa ${company.name}.
      Descrição do negócio: ${company.description || 'Não informada'}.
      Horário de funcionamento: ${company.business_hours || 'Não informado'}.
      Base de conhecimento / Regras / Serviços / Preços:
      ${company.knowledge_base || 'Nenhuma informação cadastrada.'}

      REGRAS RÍGIDAS DE COMPORTAMENTO:
      - Seja educado, empático e objetivo.
      - NUNCA invente preços, horários, serviços ou políticas que não estejam explicitamente na base de conhecimento acima.
      - Se o cliente fizer uma pergunta cuja resposta não esteja na base de conhecimento, responda educadamente que você precisa transferir o atendimento para um atendente humano e pergunte o nome e telefone dele.
      - Ajude o cliente a avançar no processo de compra ou agendamento de forma natural.
    `;

    // 3. Envia para a API da OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...(history || []),
        { role: 'user', content: message }
      ],
      temperature: 0.3, // Baixa temperatura para evitar invenções da IA
    });

    const aiResponse = completion.choices[0].message.content;

    res.json({ response: aiResponse });
  } catch (err) {
    console.error('Erro no chat:', err);
    res.status(500).json({ error: 'Erro interno ao processar a mensagem.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
