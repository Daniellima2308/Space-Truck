import { useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { isApprovedAccessProfile } from "@/features/access/accessTypes";
import { BINO_LANDING_ASSETS } from "@/features/access/waitingAccessAssets";
import { getWaitingAccessCopy } from "@/features/access/waitingAccessCopy";
import { useAccessProfile } from "@/features/access/useAccessProfile";
import {
  FontAwesomeIcon,
  iconCheckCircle,
  iconClock3,
  iconLogOut,
  iconShield,
  iconSparkles,
  iconTruck,
} from "@/lib/icons";
import { Link, useNavigate } from "react-router-dom";

const WaitingAccessPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const accessProfileQuery = useAccessProfile(user?.id);
  const accessStatus = accessProfileQuery.data?.accessStatus;
  const copy = getWaitingAccessCopy(accessStatus);

  useEffect(() => {
    if (isApprovedAccessProfile(accessProfileQuery.data)) {
      navigate("/", { replace: true });
    }
  }, [accessProfileQuery.data, navigate]);

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_34%),radial-gradient(circle_at_bottom_right,hsl(var(--profit)/0.12),transparent_30%)]" />

      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-4 py-10 sm:px-6">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link to="/inicio" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <FontAwesomeIcon icon={iconTruck} aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em]">Space Truck</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Acesso antecipado</p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/50 px-4 py-2 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
          >
            <FontAwesomeIcon icon={iconLogOut} aria-hidden="true" className="h-3.5 w-3.5" />
            Sair
          </button>
        </div>

        <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-primary/20 bg-secondary/35 p-6 shadow-2xl shadow-primary/5 backdrop-blur sm:p-8">
            <div className={`mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] ${copy.badgeTone}`}>
              <FontAwesomeIcon icon={copy.icon} aria-hidden="true" className={`h-3.5 w-3.5 ${copy.iconTone}`} />
              {copy.badge}
            </div>

            <h1 className="max-w-2xl text-4xl font-black leading-tight tracking-tight text-foreground sm:text-5xl">
              {copy.heading}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {copy.message}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <FontAwesomeIcon icon={iconCheckCircle} aria-hidden="true" className="mb-3 h-5 w-5 text-profit" />
                <p className="text-sm font-bold">Conta registrada</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Seu cadastro já está vinculado ao e-mail usado no login.</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <FontAwesomeIcon icon={iconClock3} aria-hidden="true" className="mb-3 h-5 w-5 text-warning" />
                <p className="text-sm font-bold">Liberação gradual</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">O acesso será aberto aos poucos para testar com segurança.</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <FontAwesomeIcon icon={iconShield} aria-hidden="true" className="mb-3 h-5 w-5 text-primary" />
                <p className="text-sm font-bold">App protegido</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">A área interna fica fechada até sua conta ser aprovada.</p>
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-primary/20 bg-primary/10 p-5">
              <div className="flex items-start gap-3">
                <FontAwesomeIcon icon={iconSparkles} aria-hidden="true" className="mt-1 h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-bold text-foreground">Enquanto isso, o Bino está preparando a boleia.</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Quando chegar sua vez, o app vai liberar as ferramentas de viagem, frete, custos, manutenção e leitura do lucro real.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md overflow-hidden rounded-[2rem] border border-border/70 bg-black/75 p-5 shadow-2xl shadow-primary/10">
            <img
              src={BINO_LANDING_ASSETS.welcome}
              alt="Bino dando boas-vindas ao acesso antecipado do Space Truck"
              className="mx-auto max-h-[560px] w-full object-contain object-bottom drop-shadow-2xl"
            />
          </div>
        </div>
      </section>
    </main>
  );
};

export default WaitingAccessPage;
