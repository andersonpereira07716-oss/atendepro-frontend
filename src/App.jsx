import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { Bot, Settings, MessageSquare, Building, Save, CheckCircle2, ClipboardList, Calendar, Users, TrendingUp, PhoneCall } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('config');
  
  const [businessName, setBusinessName] = useState('Assistência TecMaster');
  const [businessDesc, setBusinessDesc] = useState('Especialistas em manutenção de smartphones e computadores.');
  const [businessHours, setBusinessHours] = useState('Segunda a Sexta das 08h às 18h');
  const [knowledgeBase, setKnowledgeBase] = useState('Trabalhamos com conserto de micro-ondas, smartphones e portáteis. Orçamento gratuito na loja física.');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [stats, setStats] = useState({ messages: 0, clients: 0, orders: 0, appointments: 0 });
  const [serviceOrders, setServiceOrders] = useState([]);
  const [newClientName, setNewClientName] = useState('');
  const [newEquipment, setNewEquipment] = useState('');
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    fetchKPIs();
    if (activeTab === 'crm') fetchServiceOrders();
    if (activeTab === 'appointments') fetchAppointments();
  }, [activeTab]);

  const fetchKPIs = async () => {
    try {
      const { count: msgCount } = await supabase.from('whatsapp_messages').select('*', { count: 'exact', head: true });
      const { count: clientCount } = await supabase.from('contacts').select('*', { count: 'exact', head: true });
      const { count: orderCount } = await supabase.from('service_orders').select('*', { count: 'exact', head: true });
      const { count: appCount } = await supabase.from('appointments').select('*', { count: 'exact', head: true });

      setStats({
        messages: msgCount || 0,
        clients: clientCount || 0,
        orders: orderCount || 0,
        appointments: appCount || 0
      });
    } catch (e) {
      console.error('Erro nos KPIs', e);
    }
  };

  const saveConfig = async (e) => {
  e.preventDefault();
  try {
    const { error } = await supabase
      .from('business_config')
      .upsert({ id: 1, business_name: businessName, business_desc: businessDesc, business_hours: businessHours, knowledge_base: knowledgeBase });
    
    if (error) throw error;
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  } catch (err) {
    console.error('Erro ao salvar configurações:', err);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  }
};


  const fetchServiceOrders = async () => {
    const { data } = await supabase.from('service_orders').select('*').order('created_at', { ascending: false });
    setServiceOrders(data || []);
  };

  const addServiceOrder = async (e) => {
    e.preventDefault();
    if (!newClientName || !newEquipment) return;
    await supabase.from('service_orders').insert([{ client_name: newClientName, equipment: newEquipment, status: 'Em Análise' }]);
    setNewClientName('');
    setNewEquipment('');
    fetchServiceOrders();
    fetchKPIs();
  };

  const fetchAppointments = async () => {
    const { data } = await supabase.from('appointments').select('*').order('appointment_date', { ascending: true });
    setAppointments(data || []);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col pb-24">
      <header className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white p-4 shadow-lg flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-white/15 rounded-2xl">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">AtendePro AI</h1>
            <span className="text-[10px] px-2 py-0.5 bg-white/20 rounded-full font-medium">Painel Executivo</span>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 bg-white/10 px-3 py-1.5 rounded-xl">
          <TrendingUp className="w-4 h-4 text-emerald-300" />
          <span className="text-xs font-semibold">Online</span>
        </div>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><MessageSquare className="w-5 h-5" /></div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium uppercase">Mensagens</p>
              <p className="text-lg font-bold text-slate-800">{stats.messages}</p>
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-3">
            <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl"><Users className="w-5 h-5" /></div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium uppercase">Clientes</p>
              <p className="text-lg font-bold text-slate-800">{stats.clients}</p>
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><ClipboardList className="w-5 h-5" /></div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium uppercase">Ordens (CRM)</p>
              <p className="text-lg font-bold text-slate-800">{stats.orders}</p>
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><Calendar className="w-5 h-5" /></div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium uppercase">Agendamentos</p>
              <p className="text-lg font-bold text-slate-800">{stats.appointments}</p>
            </div>
          </div>
        </div>

        {activeTab === 'config' && (
          <form onSubmit={saveConfig} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-3.5">
            <h2 className="font-semibold text-slate-800 flex items-center space-x-2 text-sm border-b border-slate-100 pb-2.5">
              <Building className="w-4 h-4 text-indigo-600" />
              <span>Configuração do Negócio & IA</span>
            </h2>

            {savedSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Alterações guardadas com sucesso!</span>
              </div>
            )}

            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Nome do Negócio</label>
              <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700" />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Descrição da Empresa</label>
              <textarea value={businessDesc} onChange={e => setBusinessDesc(e.target.value)} rows="2" className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700 resize-none" />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Horário de Funcionamento</label>
              <input type="text" value={businessHours} onChange={e => setBusinessHours(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700" />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Base de Conhecimento (Regras da IA)</label>
              <textarea value={knowledgeBase} onChange={e => setKnowledgeBase(e.target.value)} rows="3" className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700 resize-none" />
            </div>

            <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2">
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </form>
        )}

        {activeTab === 'crm' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-4">
            <h2 className="font-semibold text-slate-800 flex items-center space-x-2 text-sm border-b border-slate-100 pb-2.5">
              <ClipboardList className="w-4 h-4 text-indigo-600" />
              <span>Gestão de Ordens de Serviço</span>
            </h2>
            
            <form onSubmit={addServiceOrder} className="space-y-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <p className="text-[11px] font-bold text-slate-700">Registar Novo Equipamento</p>
              <input type="text" placeholder="Nome do Cliente" value={newClientName} onChange={e => setNewClientName(e.target.value)} className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none font-medium" required />
              <input type="text" placeholder="Equipamento (Ex: iPhone 13)" value={newEquipment} onChange={e => setNewEquipment(e.target.value)} className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none font-medium" required />
              <button type="submit" className="w-full py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow">Registar Aparelho</button>
            </form>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {serviceOrders.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Nenhuma ordem de serviço registada.</p>
              ) : (
                serviceOrders.map(order => (
                  <div key={order.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex justify-between items-center shadow-sm">
                    <div>
                      <p className="font-bold text-slate-800">{order.client_name}</p>
                      <p className="text-slate-500 font-medium">{order.equipment}</p>
                    </div>
                    <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[10px]">{order.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-3">
            <h2 className="font-semibold text-slate-800 flex items-center space-x-2 text-sm border-b border-slate-100 pb-2.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Agenda de Atendimentos</span>
            </h2>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {appointments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Sem agendamentos registados no momento.</p>
              ) : (
                appointments.map(app => (
                  <div key={app.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs shadow-sm flex flex-col space-y-1">
                    <div className="flex justify-between items-center">
                      <p className="font-bold text-slate-800">{app.client_name}</p>
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md font-semibold">{app.service_type || 'Atendimento'}</span>
                    </div>
                    <p className="text-slate-500 font-medium flex items-center space-x-1">
                      <PhoneCall className="w-3 h-3 text-slate-400" />
                      <span>{app.phone}</span>
                    </p>
                    <p className="text-indigo-600 font-semibold pt-1">📅 {new Date(app.appointment_date).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-3 left-4 right-4 max-w-md mx-auto bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-2xl p-1.5 flex space-x-1 z-40">
        <button onClick={() => setActiveTab('config')} className={`flex-1 py-2 rounded-xl flex flex-col items-center text-[11px] font-semibold ${activeTab === 'config' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}>
          <Settings className="w-4 h-4 mb-0.5" /><span>Config</span>
        </button>
        <button onClick={() => setActiveTab('crm')} className={`flex-1 py-2 rounded-xl flex flex-col items-center text-[11px] font-semibold ${activeTab === 'crm' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}>
          <ClipboardList className="w-4 h-4 mb-0.5" /><span>CRM</span>
        </button>
        <button onClick={() => setActiveTab('appointments')} className={`flex-1 py-2 rounded-xl flex flex-col items-center text-[11px] font-semibold ${activeTab === 'appointments' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}>
          <Calendar className="w-4 h-4 mb-0.5" /><span>Agenda</span>
        </button>
      </nav>
    </div>
  );
}
