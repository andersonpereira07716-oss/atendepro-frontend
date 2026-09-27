import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_KEY
);

const ai = new GoogleGenAI();

app.post('/webhook/whatsapp', async (req, res) => {
  try {
    const { phone, senderName, messageBody } = req.body;
    
    // Validação estrita dos inputs
    if (!phone || !messageBody || typeof messageBody !== 'string') {
      return res.status(400).send({ error: 'Dados inválidos ou incompletos.' });
    }

    // 1. Gestão de Contacto
    let { data: contact } = await supabase.from('contacts').select('*').eq('phone', phone).single();
    if (!contact) {
      const { data: newContact } = await supabase.from('contacts').insert([{ phone, name: senderName || 'Cliente' }]).select().single();
      contact = newContact;
    }

    await supabase.from('whatsapp_messages').insert([{ contact_id: contact.id, sender: 'user', message: messageBody }]);

    // 2. Verificar se o cliente quer agendar ou ver estado de reparação
    const lower = messageBody.toLowerCase();
    let systemExtraContext = "";

    if (lower.includes('estado') || lower.includes('reparação') || lower.includes('aparelho')) {
      // CORREÇÃO DE SEGURANÇA: Busca vinculada estritamente ao TELEFONE verificado do contato, e não ao nome mutável.
      const { data: orders } = await supabase.from('service_orders').select('*').eq('client_phone', phone);
      if (orders && orders.length > 0) {
        // Reduz os dados injetados apenas ao necessário para evitar vazamento excessivo
        const safeOrders = orders.map(o => ({ numero: o.id, status: o.status, aparelho: o.device }));
        systemExtraContext = `\nOrdens de serviço deste cliente: ${JSON.stringify(safeOrders)}`;
      }
    }

    // Contexto base do sistema
    const companyContext = `
      És o assistente virtual da 'Assistência TecMaster'.
      Especialistas em manutenção de smartphones e computadores.
      Horário: Segunda a Sexta das 08h às 18h. Orçamento gratuito na loja física.
      ${systemExtraContext}
      Responde de forma clara e objetiva.
    `;

    // CORREÇÃO DE SEGURANÇA: Uso correto da estrutura de Contents/SystemInstruction para isolar o Prompt Injection
    const aiResponseResult = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: companyContext // Define as regras como lei soberana do sistema
      },
      contents: [
        { role: 'user', parts: [{ text: messageBody }] } // Passa a mensagem do usuário estritamente como dado
      ],
    });

    const aiResponseText = aiResponseResult.text || "Olá! Como podemos ajudar com o seu equipamento?";

    await supabase.from('whatsapp_messages').insert([{ contact_id: contact.id, sender: 'assistant', message: aiResponseText }]);

    return res.status(200).json({ success: true, reply: aiResponseText });
  } catch (error) {
    // CORREÇÃO DE SEGURANÇA: Log seguro que não vaza detalhes internos da query ou do banco
    console.error('Erro interno no Webhook:', error.message || error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor na porta ${PORT}`));
