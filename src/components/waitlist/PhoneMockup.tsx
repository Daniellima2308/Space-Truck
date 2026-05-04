import { FontAwesomeIcon, iconTruck, iconRoute, iconFuel, iconWallet, iconTrendingUp } from "@/lib/icons";

/**
 * Mockup leve (HTML/CSS) de um celular exibindo um dashboard fictício do Space Truck.
 * Sem imagens pesadas para garantir carregamento rápido em dispositivos modestos.
 */
export function PhoneMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[280px] sm:max-w-[300px]">
      {/* Glow de fundo */}
      <div
        aria-hidden="true"
        className="absolute -inset-8 -z-10 rounded-[3rem] bg-primary/20 blur-3xl"
      />

      {/* Frame do celular */}
      <div className="relative aspect-[9/19.5] overflow-hidden rounded-[2.5rem] border border-border/80 bg-[hsl(220_15%_4%)] p-2 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8),0_0_0_1px_hsl(var(--border))]">
        {/* Notch */}
        <div className="absolute left-1/2 top-3 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-[hsl(220_15%_3%)]" />

        {/* Screen */}
        <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-gradient-to-b from-[hsl(220_13%_8%)] to-[hsl(220_13%_6%)]">
          {/* Status bar */}
          <div className="flex items-center justify-between px-5 pt-3 text-[10px] font-medium text-foreground/80">
            <span>9:41</span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span>5G</span>
            </span>
          </div>

          {/* Header */}
          <div className="px-4 pt-6">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Olá, motorista
            </p>
            <h3 className="mt-0.5 text-base font-bold text-foreground">Carlos Silva</h3>
          </div>

          {/* Active trip card */}
          <div className="mx-4 mt-4 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <FontAwesomeIcon icon={iconTruck} className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Viagem ativa</p>
                  <p className="text-xs font-semibold text-foreground">SP → Manaus</p>
                </div>
              </div>
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[9px] font-semibold text-primary">
                Em rota
              </span>
            </div>

            {/* Mini chart */}
            <div className="mt-3 flex h-10 items-end gap-1">
              {[40, 55, 35, 70, 60, 85, 75, 95, 80, 100].map((height, index) => (
                <div
                  key={index}
                  className="flex-1 rounded-sm bg-primary/60"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between text-[9px] text-muted-foreground">
              <span>2.847 km</span>
              <span className="flex items-center gap-1 text-primary">
                <FontAwesomeIcon icon={iconTrendingUp} className="h-2.5 w-2.5" />
                +12%
              </span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
            <StatCard
              icon={iconWallet}
              label="Lucro líquido"
              value="R$ 8.420"
              accent="primary"
            />
            <StatCard
              icon={iconFuel}
              label="Diesel"
              value="R$ 3.150"
              accent="muted"
            />
          </div>

          {/* Recent activity */}
          <div className="mx-4 mt-3 rounded-2xl border border-border/60 bg-card/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Últimas despesas
              </p>
            </div>
            <div className="space-y-2">
              <ActivityRow label="Pedágio Régis" value="R$ 84,00" />
              <ActivityRow label="Diesel S-10" value="R$ 620,00" />
              <ActivityRow label="Manutenção" value="R$ 240,00" />
            </div>
          </div>

          {/* Bottom nav */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-around border-t border-border/60 bg-card/80 px-4 py-2.5 backdrop-blur">
            <NavIcon icon={iconTruck} active />
            <NavIcon icon={iconRoute} />
            <NavIcon icon={iconWallet} />
            <NavIcon icon={iconTrendingUp} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: Parameters<typeof FontAwesomeIcon>[0]["icon"];
  label: string;
  value: string;
  accent: "primary" | "muted";
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-2.5">
      <div className="flex items-center gap-1.5">
        <div
          className={
            accent === "primary"
              ? "flex h-5 w-5 items-center justify-center rounded-md bg-primary/20 text-primary"
              : "flex h-5 w-5 items-center justify-center rounded-md bg-muted text-muted-foreground"
          }
        >
          <FontAwesomeIcon icon={icon} className="h-2.5 w-2.5" />
        </div>
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className="mt-1.5 text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function ActivityRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

function NavIcon({
  icon,
  active = false,
}: {
  icon: Parameters<typeof FontAwesomeIcon>[0]["icon"];
  active?: boolean;
}) {
  return (
    <div
      className={
        active
          ? "flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary"
          : "flex h-7 w-7 items-center justify-center text-muted-foreground/60"
      }
    >
      <FontAwesomeIcon icon={icon} className="h-3 w-3" />
    </div>
  );
}
