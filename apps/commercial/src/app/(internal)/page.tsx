import { requireCommercialSession } from "@/lib/auth/session";
import { getSalesGoals, getAnnouncements, getTeamPerformance } from "@/lib/dashboard/dashboard.service";
import { HomePerformance } from "@/components/dashboard/home-performance";
import { TeamPerformance } from "@/components/dashboard/team-performance";
import { HomeAnnouncements } from "@/components/dashboard/home-announcements";
import Link from "next/link";
import { 
  Briefcase, 
  MapPin, 
  FileText, 
  Calendar,
  ChevronRight,
  TrendingUp,
  LayoutDashboard,
  Users
} from "lucide-react";

export default async function HomePage() {
  const user = await requireCommercialSession();
  const goals = await getSalesGoals(user.id);
  const announcements = await getAnnouncements();
  
  return (
    <div className="dashboard-container p-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <header className="mb-12 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <LayoutDashboard size={32} className="text-accent" />
            Olá, {user.name.split(' ')[0]} 👋
          </h1>
          <p className="text-muted mt-2 font-medium">Bem-vindo ao Salt ERP. Aqui está o resumo das suas metas e comunicados.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white/50 p-2 rounded-2xl border border-slate-100 backdrop-blur-sm">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Calendar size={20} />
          </div>
          <div className="pr-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">DATA DE HOJE</p>
            <p className="text-sm font-bold text-slate-700">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Lado Esquerdo: Performance Individual */}
        <div className="lg:col-span-8 flex flex-col gap-10">
          <section>
            <HomePerformance goal={goals} userName={user.name} />
          </section>

          <section>
            <HomeAnnouncements announcements={announcements} />
          </section>
        </div>

        {/* Lado Direito: Ações Rápidas */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <section className="flex flex-col gap-4">
            <div className="flex items-center px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações Rápidas</div>
            
            <Link href="/propostas/new" className="dash-card-glass p-6 group hover-scale block">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center p-2 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
                    <FileText size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800">Nova Proposta</h3>
                    <p className="text-xs text-muted">Criar proposta comercial</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
               </div>
            </Link>

            <Link href="/clientes" className="dash-card-glass p-6 group hover-scale block">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center p-2 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
                    <Users size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800">Meus Clientes</h3>
                    <p className="text-xs text-muted">Gerenciar base ativa</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
               </div>
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
