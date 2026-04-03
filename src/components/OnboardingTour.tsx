import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface TourStep {
  targetId: string;
  title: string;
  text: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: "",
    title: "Bem-vindo ao Space Truck! 🚛",
    text: "Fala, parceiro! O Space Truck foi criado para ser o seu braço direito na estrada. Vamos dar uma volta rápida pelo aplicativo para você ver como é fácil controlar seus fretes e colocar mais dinheiro no bolso. Leva só um minutinho!",
  },
  {
    targetId: "nav-tools",
    title: "Cadastre o seu Bruto",
    text: "Em Ferramentas você encontra o cadastro de Veículos. Cadastre seu caminhão com quantidade de eixos para calcular pedágio e tabela ANTT corretamente.",
  },
  {
    targetId: "nav-tools",
    title: "Não viaje no escuro",
    text: "Em Ferramentas está a Análise de Frete. Coloque a distância, o diesel e o valor do frete. O app te dá uma resposta na hora: verde, amarelo ou vermelho.",
  },
  {
    targetId: "nav-home",
    title: "O seu Painel de Controle",
    text: "Em Início você acompanha o resumo do seu negócio: faturamento, despesas e viagens do período.",
  },
  {
    targetId: "nav-history",
    title: "O fim do Caderninho",
    text: "Todas as suas viagens passadas ficam salvas no Histórico, prontas para exportar em PDF.",
  },
  {
    targetId: "nav-more",
    title: "Central do App",
    text: "Em Mais você encontra seu perfil, configurações, tema do app, suporte e muito mais.",
  },
];

export function OnboardingTour() {
  const { user } = useAuth();
  const [step, setStep] = useState(-1); // -1 = not started/checking
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("has_seen_tutorial").eq("user_id", user.id).single()
      .then(({ data }) => {
        if (data && !data.has_seen_tutorial) {
          setStep(0);
        }
      });
  }, [user]);

  const updateTargetRect = useCallback((targetId: string) => {
    if (!targetId) {
      setTargetRect(null);
      return;
    }
    const el = document.getElementById(targetId);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    }
  }, []);

  useEffect(() => {
    if (step > 0 && step < TOUR_STEPS.length) {
      updateTargetRect(TOUR_STEPS[step].targetId);
    } else {
      setTargetRect(null);
    }
  }, [step, updateTargetRect]);

  const finishTour = async () => {
    setStep(-1);
    if (user) {
      await supabase.from("profiles").update({ has_seen_tutorial: true }).eq("user_id", user.id);
    }
    toast({ title: "Tour finalizado! 🎉", description: "Cadastre seu veículo para começar." });
  };

  if (step < 0) return null;

  const current = TOUR_STEPS[step];
  const isFirst = step === 0;
  const isLast = step === TOUR_STEPS.length - 1;

  // Calculate popover position
  let popoverStyle: React.CSSProperties = {};
  if (targetRect) {
    popoverStyle = {
      position: "fixed",
      bottom: `${window.innerHeight - targetRect.top + 12}px`,
      left: "50%",
      transform: "translateX(-50%)",
    };
  }

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Spotlight on target */}
      {targetRect && (
        <div
          className="absolute rounded-xl border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            zIndex: 101,
          }}
        />
      )}

      {/* Popover */}
      <div
        className="bg-card border border-border rounded-2xl p-6 w-[90vw] max-w-sm shadow-2xl"
        style={targetRect ? { ...popoverStyle, zIndex: 102 } : { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 102 }}
      >
        <h2 className="text-xl font-black mb-3">{current.title}</h2>
        <p className="text-base text-muted-foreground leading-relaxed mb-6">{current.text}</p>

        <div className="flex gap-2">
          {isFirst ? (
            <button onClick={() => setStep(1)} className="flex-1 gradient-profit text-primary-foreground rounded-xl py-3 text-base font-bold">
              Começar o Tour
            </button>
          ) : (
            <>
              <button onClick={() => setStep(step - 1)} className="px-4 py-3 bg-secondary rounded-xl text-sm font-medium">
                Anterior
              </button>
              {isLast ? (
                <button onClick={finishTour} className="flex-1 gradient-profit text-primary-foreground rounded-xl py-3 text-base font-bold">
                  Finalizar Tour
                </button>
              ) : (
                <button onClick={() => setStep(step + 1)} className="flex-1 gradient-profit text-primary-foreground rounded-xl py-3 text-base font-bold">
                  Próximo
                </button>
              )}
            </>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex justify-center gap-1.5 mt-4">
          {TOUR_STEPS.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${i === step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
