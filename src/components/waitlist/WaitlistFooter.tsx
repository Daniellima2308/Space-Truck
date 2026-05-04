import { FontAwesomeIcon, iconTruck } from "@/lib/icons";

export function WaitlistFooter() {
  return (
    <footer className="border-t border-border/40 bg-card/30 py-8">
      <div className="container mx-auto flex flex-col items-center gap-3 px-4 text-center">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
            <FontAwesomeIcon icon={iconTruck} className="h-3.5 w-3.5" />
          </div>
          <span className="font-mono text-sm font-bold tracking-tight text-foreground">
            SPACE TRUCK
          </span>
        </div>
        <p className="text-xs italic text-muted-foreground">
          Desenvolvido por quem conhece o trecho.
        </p>
        <p className="text-[11px] text-muted-foreground/70">
          &copy; 2026 Space Truck. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
