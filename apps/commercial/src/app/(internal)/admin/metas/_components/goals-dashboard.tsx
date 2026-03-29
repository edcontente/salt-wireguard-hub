"use client";

import React, { useState } from "react";
import { SalesGoalForm } from "./sales-goal-form";
import { GoalsTable } from "./goals-table";
import { useRouter } from "next/navigation";
import { deleteSalesGoalAction } from "../../actions";
import { AlertTriangle, X, Trash2 } from "lucide-react";

export function GoalsDashboard({ 
  initialGoals, 
  users 
}: { 
  initialGoals: any[]; 
  users: any[] 
}) {
  const [editingGoal, setEditingGoal] = useState<any | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleSuccess = () => {
    setEditingGoal(null);
    router.refresh();
  };

  const handleDeleteRequest = (id: string) => {
    setConfirmingDelete(id);
  };

  const handleConfirmDelete = async () => {
    if (!confirmingDelete) return;
    setIsDeleting(true);
    try {
      await deleteSalesGoalAction(confirmingDelete);
      setConfirmingDelete(null);
      router.refresh();
    } catch (error) {
      alert("Falha ao remover meta.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Coluna do Formulário (Cards Soltos) */}
        <div className="lg:col-span-4 sticky top-6">
          <SalesGoalForm 
             goal={editingGoal} 
             users={users} 
             onSuccess={handleSuccess}
             onClear={() => setEditingGoal(null)}
          />
        </div>

        {/* Coluna da Tabela */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="dash-card-glass p-0 overflow-hidden shadow-xl border-slate-100/50">
             <GoalsTable 
                goals={initialGoals} 
                onEdit={(goal) => {
                   setEditingGoal(goal);
                   window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onDelete={handleDeleteRequest}
             />
          </div>
        </div>
      </div>

      {/* Premium Deletion Modal Overlay */}
      {confirmingDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-white/50 overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-10 text-center space-y-6">
                 <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-red-50 text-red-500 shadow-inner">
                    <Trash2 size={32} />
                 </div>
                 
                 <div className="space-y-2">
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Excluir Meta?</h3>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed px-4">
                       Esta ação é permanente e removerá os dados de planejamento deste período do sistema.
                    </p>
                 </div>

                 <div className="grid grid-cols-2 gap-4 pt-4">
                    <button 
                       onClick={() => setConfirmingDelete(null)}
                       disabled={isDeleting}
                       className="py-4 px-6 rounded-2xl bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-50"
                    >
                       Cancelar
                    </button>
                    <button 
                       onClick={handleConfirmDelete}
                       disabled={isDeleting}
                       className="py-4 px-6 rounded-2xl bg-red-500 text-white font-black text-[10px] uppercase tracking-widest hover:bg-red-600 shadow-lg shadow-red-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                       {isDeleting ? "APAGANDO..." : "SIM, EXCLUIR"}
                    </button>
                 </div>
              </div>
              
              <button 
                 onClick={() => setConfirmingDelete(null)}
                 className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-800 transition-colors"
              >
                 <X size={20} />
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
