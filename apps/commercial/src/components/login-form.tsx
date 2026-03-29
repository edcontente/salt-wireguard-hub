import React from "react";
import { Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";

type LoginFormProps = {
  errorMessage?: string;
};

export function LoginForm({ errorMessage }: LoginFormProps) {
  return (
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="dash-card-glass p-8 md:p-12 relative overflow-hidden group">
         {/* Background Glow */}
         <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent/10 rounded-full blur-3xl group-hover:bg-accent/20 transition-all duration-700"></div>
         
         <div className="relative z-10">
            {/* Logo Section */}
            <div className="flex flex-col items-center text-center mb-10">
               <div className="w-20 h-20 mb-6 relative">
                  <div className="absolute inset-0 bg-accent/20 rounded-3xl blur-2xl animate-pulse"></div>
                  <img src="/logo.png" alt="Salt Logo" className="relative w-full h-full object-contain drop-shadow-2xl" />
               </div>
               <h1 className="text-3xl font-black text-slate-800 tracking-tighter">Salt Commercial</h1>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Engenharia e Automação Ltda</p>
            </div>

            <form action="/api/login" className="space-y-6" method="post">
               <div className="space-y-2">
                  <label htmlFor="email" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail de Usuário</label>
                  <div className="relative">
                     <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                     <input 
                        id="email" 
                        name="email" 
                        type="email" 
                        autoComplete="username" 
                        className="form-input !pl-12 !py-4 !rounded-2xl border-slate-100 focus:border-accent shadow-sm font-medium" 
                        required 
                        placeholder="nome@empresa.com"
                     />
                  </div>
               </div>

               <div className="space-y-2">
                  <label htmlFor="password" title="Senha" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha de Acesso</label>
                  <div className="relative">
                     <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                     <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        className="form-input !pl-12 !py-4 !rounded-2xl border-slate-100 focus:border-accent shadow-sm font-medium"
                        required
                        placeholder="••••••••"
                     />
                  </div>
               </div>

               {errorMessage && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 animate-shake">
                     <ShieldCheck size={16} className="text-red-500 mt-0.5" />
                     <p className="text-xs font-bold text-red-600 leading-tight">
                        {errorMessage}
                     </p>
                  </div>
               )}

               <button 
                  type="submit" 
                  className="w-full btn-submit !py-5 !rounded-2xl flex items-center justify-center gap-3 text-sm font-black shadow-xl shadow-accent/20 border-b-4 border-accent-hover active:border-b-0 active:translate-y-1 transition-all group"
               >
                  ENTRAR NO SISTEMA
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
               </button>
            </form>
            
            <div className="mt-10 pt-8 border-t border-slate-50 text-center">
               <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">© 2026 Salt Systems • Premium ERP</p>
            </div>
         </div>
      </div>
    </div>
  );
}
