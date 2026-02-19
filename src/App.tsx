import { useEffect, useState } from 'react';
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
  ArrowDownRight
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

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();

    // Real-time subscription
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
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestão Financeira</h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <MessageSquare className="w-4 h-4" />
              Integrado com WhatsApp via WAHA
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-black/5 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium">
                {format(new Date(), "MMMM, yyyy", { locale: ptBR })}
              </span>
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Wallet className="w-12 h-12" />
            </div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Saldo Atual</p>
            <h2 className="text-4xl font-bold tabular-nums">
              R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h2>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full w-fit">
              <TrendingUp className="w-3 h-3" />
              +2.5% este mês
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <ArrowUpRight className="w-12 h-12 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1 text-emerald-600">Entradas</p>
            <h2 className="text-4xl font-bold tabular-nums text-emerald-600">
              R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h2>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <ArrowDownRight className="w-12 h-12 text-red-500" />
            </div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1 text-red-600">Saídas</p>
            <h2 className="text-4xl font-bold tabular-nums text-red-600">
              R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart & Transactions */}
          <div className="lg:col-span-2 space-y-8">
            {/* Recent Transactions */}
            <section className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
              <div className="p-6 border-bottom border-black/5 flex items-center justify-between">
                <h3 className="text-xl font-bold">Transações Recentes</h3>
                <button 
                  onClick={fetchTransactions}
                  className="text-sm font-medium text-emerald-600 hover:underline"
                >
                  Ver todas
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
                        <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Carregando...</td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Nenhuma transação encontrada. Envie uma mensagem no WhatsApp!</td>
                      </tr>
                    ) : (
                      transactions.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
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
                            {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                          </td>
                        </tr>
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
              <div className="h-[300px] w-full">
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
              </div>
              <div className="mt-4 space-y-2">
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
              <h3 className="text-lg font-bold mb-2">Como usar?</h3>
              <p className="text-sm text-emerald-50 opacity-90 mb-4">
                Envie mensagens como:
              </p>
              <ul className="text-xs space-y-2 text-emerald-50">
                <li className="bg-white/10 p-2 rounded-xl">"Gastei 50 reais com almoço hoje"</li>
                <li className="bg-white/10 p-2 rounded-xl">"Recebi 3000 de salário"</li>
                <li className="bg-white/10 p-2 rounded-xl">"Paguei 120 de internet"</li>
              </ul>
              <div className="mt-6 pt-6 border-t border-white/20">
                <p className="text-[10px] uppercase tracking-widest opacity-60">Status da Integração</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse" />
                  <span className="text-xs font-medium">WAHA Conectado</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
