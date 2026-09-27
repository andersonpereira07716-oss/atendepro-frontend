for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: contents,
      config: { systemInstruction },
    });

    const respostaTexto = response.text;
    
    // Guardar na base de dados e retornar
    await supabase.from('chat_history').insert([
      { remote_jid: remoteJid, role: 'user', content: mensagemUsuario },
      { remote_jid: remoteJid, role: 'model', content: respostaTexto }
    ]);

    return respostaTexto;
  } catch (error) {
    console.error(`Tentativa ${tentativa} falhou:`, error);
    if (tentativa === maxTentativas) throw error;
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}
