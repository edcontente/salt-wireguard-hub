import { requireCommercialSession } from "@/lib/auth/session";
import { getTeamPerformance } from "@/lib/dashboard/dashboard.service";
import { TeamPerformance } from "@/components/dashboard/team-performance";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  ArrowUpRight 
} from "lucide-react";

export default async function TeamDashboardPage() {
  const user = await requireCommercialSession();
  
  if (!user.canManageUsers && user.profileSlug !== "admin") {
    return (
      <div className="p-20 text-center">
        <h2 className="text-2xl font-black text-slate-800">Acesso Restrito</h2>
        <p className="text-slate-500 mt-2">Esta tela é destinada apenas a gestores e diretores.</p>
      </div>
    );
  }

  const now = new Date();
  const teamData = await getTeamPerformance(now.getMonth() + 1, now.getFullYear());

  return (
    <div className="dashboard-container p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="mb-12">
        <div className="flex items-center gap-3 mb-2">
           <div className="w-10 h-10 rounded-2xl bg-accent/10 text-accent flex items-center justify-center p-2">
              <BarChart3 size={24} />
           </div>
           <h1 className="text-4xl font-black text-slate-800 tracking-tight">Dashboard de Equipe</h1>
        </div>
        <p className="text-muted font-medium ml-1">Análise consolidada de performance, metas globais e indicadores comerciais.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Métricas Principais (KPIs) */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
           {/* Ticket Médio (Ex-Home) */}
           <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl dash-card-elevation">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/20 rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                   <span className="text-[10px] font-black text-accent uppercase tracking-widest">TICKET MÉDIO GLOBAL</span>
                   <div className="p-2 bg-white/10 rounded-lg">
                      <TrendingUp size={16} className="text-accent" />
                   </div>
                </div>
                <div className="flex items-end gap-3 mb-6">
                  <strong className="text-4xl font-black tracking-tighter">R$ 14.500</strong>
                  <span className="text-emerald-400 text-xs font-bold flex items-center mb-2 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                    <ArrowUpRight size={12} className="mr-1" />+8%
                  </span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed max-w-[200px]">A média global de vendas subiu em relação ao mês anterior.</p>
              </div>
           </div>

           <div className="dash-card-glass p-8 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">VENDEDORES ATIVOS</span>
                 <Users size={18} className="text-slate-300" />
              </div>
              <div>
                 <p className="text-3xl font-black text-slate-800">12</p>
                 <p className="text-[10px] font-bold text-emerald-500 uppercase mt-1 tracking-wider">100% ONLINE</p>
              </div>
           </div>

           <div className="dash-card-glass p-8 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RECEITA TOTAL ESTIMADA</span>
                 <DollarSign size={18} className="text-slate-300" />
              </div>
              <div>
                 <p className="text-3xl font-black text-slate-800">R$ 248.900</p>
                 <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider">MARGEM MÉDIA 140%</p>
              </div>
           </div>
        </div>

        {/* Visão de Equipe (Tabelas e Detalhes) */}
        <div className="lg:col-span-12">
           <TeamPerformance data={teamData} />
        </div>
      </div>
    </div>
  );
}
