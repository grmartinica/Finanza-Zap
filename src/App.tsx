import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  PlusCircle, 
  MessageSquare, 
  Calendar,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Transaction } from './types';
import { motion, AnimatePresence } from 'motion/react';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

interface SystemStatus {
  supabase: boolean;
  gemini: boolean;
  waha: boolean;
  env: {
    supabase: boolean;
    gemini: boolean;
    waha: boolean;
  };
}

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [simulationText, setSimulationText] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      console.error('Status check failed', e);
    }
  };

  useEffect(() => {
    fetchTransactions();
    checkStatus();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions' },
        (payload) => {
          setTransactions((prev) => [payload.new as Transaction, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulationText.trim()) return;

    setSimulating(true);
    setSimResult(null);
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: simulationText }),
      });
      const data = await res.json();
      if (data.success) {
        setSimResult({ success: true, message: 'Transação processada com sucesso!' });
        setSimulationText('');
      } else {
        setSimResult({ success: false, message: data.error || 'Falha ao processar.' });
      }
    } catch (e) {
      setSimResult({ success: false, message: 'Erro de conexão com o servidor.' });
    } finally {
      setSimulating(false);
      setTimeout(() => setSimResult(null), 5000);
    }
  };

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = totalIncome - totalExpenses;

  const categoryData = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc: any[], t) => {
      const existing = acc.find((item) => item.name === t.category);
      if (existing) {
        existing.value += t.amount;
      } else {
        acc.push({ name: t.category, value: t.amount });
      }
      return acc;
    }, []);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Wallet className="w-8 h-8 text-emerald-600" />
              Gestor Financeiro Real
            </h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
              Conectado ao Supabase & Gemini AI
            </p>
          </motion.div>
          
          <div className="flex items-center gap-3">
            <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-black/5 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium">
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </span>
            </div>
          </div>
        </header>

        {/* Status Dashboard */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatusCard 
            label="Supabase" 
            connected={status?.supabase || false} 
            configured={status?.env.supabase || false} 
          />
          <StatusCard 
            label="Gemini AI" 
            connected={status?.gemini || false} 
            configured={status?.env.gemini || false} 
          />
          <StatusCard 
            label="WhatsApp (WAHA)" 
            connected={status?.waha || false} 
            configured={status?.env.waha || false} 
          />
          <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold opacity-70">App Status</p>
              <p className="text-sm font-bold">Produção</p>
            </div>
            <ShieldCheck className="w-6 h-6 opacity-50" />
          </div>
        </section>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard 
            label="Saldo Atual" 
            value={balance} 
            icon={<Wallet className="w-12 h-12" />}
            trend="+2.5% este mês"
          />
          <StatCard 
            label="Entradas" 
            value={totalIncome} 
            icon={<ArrowUpRight className="w-12 h-12 text-emerald-500" />}
            color="text-emerald-600"
          />
          <StatCard 
            label="Saídas" 
            value={totalExpenses} 
            icon={<ArrowDownRight className="w-12 h-12 text-red-500" />}
            color="text-red-600"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Simulator Section */}
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-black/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Send className="w-5 h-5 text-emerald-600" />
                  Simulador de Mensagem
                </h3>
                <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-full font-bold uppercase">Teste o Fluxo Real</span>
              </div>
              <form onSubmit={handleSimulate} className="flex gap-2">
                <input 
                  type="text" 
                  value={simulationText}
                  onChange={(e) => setSimulationText(e.target.value)}
                  placeholder='Ex: "Gastei 45 reais com Uber agora pouco"'
                  className="flex-1 bg-slate-50 border border-black/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
                <button 
                  disabled={simulating || !simulationText.trim()}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {simulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Enviar
                </button>
              </form>
              <AnimatePresence>
                {simResult && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`mt-4 p-3 rounded-xl flex items-center gap-2 text-sm font-medium ${simResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
                  >
                    {simResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {simResult.message}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Recent Transactions */}
            <section className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
              <div className="p-6 border-bottom border-black/5 flex items-center justify-between">
                <h3 className="text-xl font-bold">Transações Recentes</h3>
                <button 
                  onClick={fetchTransactions}
                  className="text-sm font-medium text-emerald-600 hover:underline"
                >
                  Atualizar
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-6 py-4 font-semibold">Data</th>
                      <th className="px-6 py-4 font-semibold">Descrição</th>
                      <th className="px-6 py-4 font-semibold">Categoria</th>
                      <th className="px-6 py-4 font-semibold text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                          Carregando...
                        </td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center">
                          <div className="max-w-xs mx-auto">
                            <MessageSquare className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-muted-foreground font-medium">Nenhuma transação encontrada.</p>
                            <p className="text-xs text-muted-foreground mt-1">Use o simulador acima ou envie uma mensagem no WhatsApp para começar!</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      transactions.map((t) => (
                        <motion.tr 
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          key={t.id} 
                          className="hover:bg-slate-50/50 transition-colors group"
                        >
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {format(new Date(t.created_at), 'dd/MM/yy HH:mm')}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium">{t.description}</div>
                            {t.whatsapp_from && (
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <MessageSquare className="w-2 h-2" /> {t.whatsapp_from}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 rounded-lg bg-slate-100 text-[11px] font-bold uppercase tracking-tight">
                              {t.category}
                            </span>
                          </td>
                          <td className={`px-6 py-4 text-right font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Sidebar Charts */}
          <div className="space-y-8">
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-black/5">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-emerald-600" />
                Gastos por Categoria
              </h3>
              <div className="h-[260px] w-full">
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm italic">
                    Sem dados de gastos
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {categoryData.map((item: any, index: number) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-medium">R$ {item.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* WAHA Info */}
            <section className="bg-emerald-600 p-6 rounded-3xl shadow-lg text-white relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <PlusCircle className="w-32 h-32" />
              </div>
              <h3 className="text-lg font-bold mb-2">Instruções de Uso</h3>
              <p className="text-sm text-emerald-50 opacity-90 mb-4">
                O bot entende linguagem natural. Tente:
              </p>
              <ul className="text-xs space-y-2 text-emerald-50">
                <li className="bg-white/10 p-2 rounded-xl">"Recebi 2500 de bônus"</li>
                <li className="bg-white/10 p-2 rounded-xl">"Gastei 12 reais na padaria"</li>
                <li className="bg-white/10 p-2 rounded-xl">"Paguei 200 de condomínio"</li>
              </ul>
              <div className="mt-6 pt-6 border-t border-white/20">
                <p className="text-[10px] uppercase tracking-widest opacity-60">Integração WhatsApp</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${status?.waha ? 'bg-emerald-300 animate-pulse' : 'bg-red-400'}`} />
                  <span className="text-xs font-medium">{status?.waha ? 'WAHA Online' : 'WAHA Offline'}</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ label, connected, configured }: { label: string; connected: boolean; configured: boolean }) {
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-black/5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{label}</span>
        {connected ? (
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
        ) : (
          <ShieldAlert className="w-4 h-4 text-red-400" />
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-400'}`} />
        <span className="text-xs font-bold">{connected ? 'Conectado' : configured ? 'Erro de Conexão' : 'Não Configurado'}</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, trend, color = "text-[#1A1A1A]" }: { label: string; value: number; icon: React.ReactNode; trend?: string; color?: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        {icon}
      </div>
      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <h2 className={`text-4xl font-bold tabular-nums ${color}`}>
        R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </h2>
      {trend && (
        <div className="mt-4 flex items-center gap-2 text-xs font-medium px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full w-fit">
          <TrendingUp className="w-3 h-3" />
          {trend}
        </div>
      )}
    </div>
  );
}
