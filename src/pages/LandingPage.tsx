import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FontAwesomeIcon,
  iconArrowRight,
  iconCalculator,
  iconCheckCircle,
  iconClock3,
  iconDollarSign,
  iconFuel,
  iconGauge,
  iconLock,
  iconReceipt,
  iconRoute,
  iconShield,
  iconSparkles,
  iconTrendingUp,
  iconTruck,
  iconTruckMoving,
  iconWallet,
  iconWrench,
  type IconDefinition,
} from "@/lib/icons";

type LandingCard = {
  title: string;
  text: string;
  icon: IconDefinition;
};

type BinoImageProps = {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel: string;
};

const BINO_ASSETS = {
  heroPhone: "/branding/bino/poses/3d/meio-corpo/bino-hero-phone.png",
  assistantPointing: "/branding/bino/poses/3d/corpo-inteiro/bino-assistant-pointing.png",
  usingPhoneMid: "/branding/bino/poses/3d/corpo-inteiro/bino-using-phone-mid.png",
  welcome: "/branding/bino/poses/3d/corpo-inteiro/bino-welcome-open-hands.png",
};

const painCards: LandingCard[] = [
  {
    title: "Frete entra, gasto sai",
    text: "Diesel, pedágio, alimentação, manutenção, adiantamento e comissão se misturam no trecho.",
    icon: iconReceipt,
  },
  {
    title: "Conta espalhada",
    text: "Parte fica no caderno, parte no WhatsApp, parte na memória e parte no comprovante perdido.",
    icon: iconWallet,
  },
  {
    title: "Decisão no escuro",
    text: "Sem custo por km e saldo limpo, fica mais difícil saber se o próximo frete compensa.",
    icon: iconRoute,
  },
];

const readingCards: LandingCard[] = [
  {
    title: "Lucro real da viagem",
    text: "Veja quanto sobrou depois de frete, comissão, abastecimento, despesas e gastos pessoais.",
    icon: iconTrendingUp,
  },
  {
    title: "Custo por km",
    text: "Entenda se o trecho está saudável ou rodando pesado demais para o bolso.",
    icon: iconGauge,
  },
  {
    title: "Gastos que mais pesam",
    text: "Diesel, pedágio, alimentação, manutenção e outros lançamentos entram na mesma leitura.",
    icon: iconFuel,
  },
  {
    title: "Histórico para comparar",
    text: "Compare viagens, rotas e resultados para aprender quais trechos valem mais a pena.",
    icon: iconClock3,
  },
];

const toolCards: LandingCard[] = [
  {
    title: "Análise de frete",
    text: "Simule rota, diesel, pedágio, comissão, ANTT e margem antes de aceitar uma carga.",
    icon: iconCalculator,
  },
  {
    title: "Viagem ativa",
    text: "Acompanhe o trecho em andamento com leituras de saldo, custos, KM e fretes.",
    icon: iconTruckMoving,
  },
  {
    title: "Manutenção no radar",
    text: "Use o KM lançado na operação para não perder serviços importantes do caminhão.",
    icon: iconWrench,
  },
];

const routeSteps = ["Frete", "Diesel", "Despesas", "Lucro", "Manutenção", "Histórico", "Acesso"];

const demoMetrics = [
  { label: "Saldo da viagem", value: "R$ 1.280,00", tone: "text-profit" },
  { label: "Custo por km", value: "R$ 2,87", tone: "text-warning" },
  { label: "Fretes concluídos", value: "15/15", tone: "text-info" },
];

const faqs = [
  {
    question: "O Space Truck já está disponível?",
    answer:
      "Ainda está em fase de preparação e acesso antecipado. A liberação será feita aos poucos para testar com segurança na rotina real da estrada.",
  },
  {
    question: "Preciso pagar para entrar na lista?",
    answer:
      "Não. O pré-registro serve para acompanhar o lançamento e permitir que os primeiros usuários sejam chamados quando o acesso for liberado.",
  },
  {
    question: "É para autônomo ou dono de frota?",
    answer:
      "A primeira versão conversa principalmente com caminhoneiro autônomo, motorista que controla comissão e dono de um caminhão ou pequena frota.",
  },
  {
    question: "O Bino vai ser só mascote?",
    answer:
      "Não. A ideia é que o Bino funcione como copiloto inteligente, explicando leituras, alertas e decisões dentro do app.",
  },
];

function scrollToEarlyAccess() {
  document.getElementById("pre-registro")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function BinoImage({ src, alt, className, fallbackLabel }: BinoImageProps) {
  const [assetFailed, setAssetFailed] = useState(false);

  if (assetFailed) {
    return (
      <div className="flex min-h-48 w-full flex-col items-center justify-center rounded-[2rem] border border-dashed border-primary/40 bg-primary/10 p-6 text-center">
        <span className="text-4xl font-black text-primary">B</span>
        <span className="mt-2 max-w-36 text-xs font-semibold text-muted-foreground">{fallbackLabel}</span>
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} onError={() => setAssetFailed(true)} />;
}

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function FeatureCard({ card }: { card: LandingCard }) {
  return (
    <div className="group rounded-3xl border border-border/70 bg-secondary/35 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-secondary/55 hover:shadow-xl hover:shadow-primary/5">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
        <FontAwesomeIcon icon={card.icon} className="h-5 w-5" />
      </div>
      <h3 className="text-base font-bold text-foreground">{card.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.text}</p>
    </div>
  );
}

function MiniCockpitCard() {
  return (
    <div className="rounded-[1.7rem] border border-border/70 bg-background/95 p-4 shadow-2xl shadow-primary/10 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Space Truck</p>
          <p className="text-sm font-bold text-foreground">Viagem em leitura</p>
        </div>
        <span className="rounded-full bg-profit/15 px-2.5 py-1 text-[10px] font-bold uppercase text-profit">Ativa</span>
      </div>

      <div className="rounded-2xl border border-profit/20 bg-profit/10 p-4">
        <p className="text-xs text-muted-foreground">Saldo limpo estimado</p>
        <p className="mt-1 text-3xl font-black tracking-tight text-profit">R$ 1.280,00</p>
        <p className="mt-1 text-xs text-muted-foreground">Depois de frete, diesel, comissão e despesas.</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          { icon: iconFuel, label: "Diesel", value: "R$ 2.940", tone: "text-warning" },
          { icon: iconRoute, label: "Próxima parada", value: "Uberlândia", tone: "text-info" },
          { icon: iconGauge, label: "Custo/KM", value: "R$ 2,87", tone: "text-primary" },
          { icon: iconCheckCircle, label: "Fretes", value: "15/15", tone: "text-profit" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border/70 bg-secondary/50 p-3">
            <FontAwesomeIcon icon={item.icon} className={`mb-2 h-4 w-4 ${item.tone}`} />
            <p className="text-[11px] text-muted-foreground">{item.label}</p>
            <p className="font-bold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="absolute -inset-8 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative overflow-hidden rounded-[2.4rem] border border-primary/20 bg-gradient-to-b from-secondary/95 to-background p-4 shadow-2xl shadow-primary/10">
        <div className="absolute right-4 top-4 z-10 rounded-full border border-primary/20 bg-background/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary backdrop-blur">
          Copiloto IA
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_0.85fr] md:items-center">
          <div className="relative min-h-[360px] overflow-hidden rounded-[2rem] bg-black/80">
            <div className="absolute inset-x-6 bottom-0 top-6 rounded-full bg-primary/10 blur-3xl" />
            <BinoImage
              src={BINO_ASSETS.heroPhone}
              alt="Bino apresentando o Space Truck em um celular"
              fallbackLabel="Bino hero phone"
              className="relative z-10 h-full min-h-[360px] w-full object-contain object-bottom drop-shadow-2xl"
            />
          </div>
          <div className="md:-ml-16 md:mr-1">
            <MiniCockpitCard />
          </div>
        </div>
      </div>
    </div>
  );
}

function BinoAssistantCard() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-background/80 p-5 shadow-2xl shadow-primary/5 backdrop-blur">
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -bottom-10 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full bg-profit/10 blur-3xl" />

      <div className="relative grid gap-4 sm:grid-cols-[0.9fr_1.1fr] sm:items-center">
        <div className="flex min-h-[260px] items-end justify-center overflow-hidden rounded-3xl border border-border/70 bg-black/75 p-4">
          <BinoImage
            src={BINO_ASSETS.assistantPointing}
            alt="Bino apontando e explicando as leituras do Space Truck"
            fallbackLabel="Bino apontando"
            className="max-h-80 w-auto object-contain object-bottom drop-shadow-2xl"
          />
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Copiloto inteligente</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-foreground">
              Bino traduz os números da estrada em decisão.
            </h3>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            {[
              "Esse trecho ficou apertado porque o diesel pesou mais que o previsto.",
              "Seu custo por km subiu. Vale revisar abastecimento e despesas.",
              "A viagem está boa, mas ainda falta lançar um gasto para fechar a leitura.",
            ].map((message) => (
              <p key={message} className="rounded-2xl border border-border/60 bg-secondary/50 p-3">
                “{message}”
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const LandingPage = () => {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_32%),radial-gradient(circle_at_top_right,hsl(var(--profit)/0.12),transparent_28%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))]" />

      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/78 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/inicio" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <FontAwesomeIcon icon={iconTruck} className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em]">Space Truck</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">A rota do lucro real</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-semibold text-muted-foreground md:flex">
            <a href="#leituras" className="transition-colors hover:text-foreground">Leituras</a>
            <a href="#bino" className="transition-colors hover:text-foreground">Bino</a>
            <a href="#pre-registro" className="transition-colors hover:text-foreground">Acesso</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden rounded-full px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground sm:inline-flex">
              Entrar
            </Link>
            <button
              type="button"
              onClick={scrollToEarlyAccess}
              className="rounded-full bg-primary px-4 py-2 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-95"
            >
              Pré-registro
            </button>
          </div>
        </div>
      </header>

      <section className="relative px-4 pb-20 pt-12 sm:px-6 lg:pb-28 lg:pt-18">
        <div className="absolute left-1/2 top-8 -z-10 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              <span className="h-2 w-2 rounded-full bg-profit animate-pulse" />
              Acesso antecipado em preparação
            </div>
            <h1 className="text-4xl font-black leading-[0.98] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Saiba se a viagem deu lucro de verdade.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              O Space Truck está sendo criado para caminhoneiros controlarem fretes, despesas, diesel, manutenção e saldo limpo com leitura rápida, sem planilha e sem chute.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={scrollToEarlyAccess}
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-sm font-black text-primary-foreground shadow-xl shadow-primary/20 transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
              >
                Quero acesso antecipado
                <FontAwesomeIcon icon={iconArrowRight} className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <a
                href="#como-funciona"
                className="inline-flex items-center justify-center rounded-2xl border border-border/70 bg-secondary/50 px-6 py-4 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
              >
                Ver como funciona
              </a>
            </div>

            <div className="mt-8 grid max-w-2xl grid-cols-1 gap-2 sm:grid-cols-3">
              {demoMetrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-border/60 bg-secondary/35 p-3">
                  <p className="text-[11px] text-muted-foreground">{metric.label}</p>
                  <p className={`mt-1 text-lg font-black ${metric.tone}`}>{metric.value}</p>
                </div>
              ))}
            </div>
          </div>

          <HeroVisual />
        </div>
      </section>

      <section className="relative border-y border-border/50 bg-secondary/20 px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3">
          {routeSteps.map((step, index) => (
            <div key={step} className="flex items-center gap-3">
              <span className="rounded-full border border-primary/25 bg-background px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {step}
              </span>
              {index < routeSteps.length - 1 && <span className="hidden h-px w-8 bg-primary/30 sm:block" />}
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <SectionTitle
            eyebrow="Dor real"
            title="No fim da viagem, nem sempre é fácil saber quanto sobrou."
            text="O problema não é só lançar dado. É transformar a rotina da estrada em uma leitura que ajude o caminhoneiro a decidir melhor."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {painCards.map((card) => <FeatureCard key={card.title} card={card} />)}
          </div>
        </div>
      </section>

      <section id="leituras" className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Leitura operacional</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                Não é só anotar. É entender a viagem.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                O Space Truck pega frete, combustível, despesas, comissão, KM e histórico para mostrar uma visão mais clara do resultado.
              </p>
              <div className="mt-6 rounded-3xl border border-profit/20 bg-profit/10 p-5">
                <div className="flex items-center gap-3">
                  <FontAwesomeIcon icon={iconDollarSign} className="h-5 w-5 text-profit" />
                  <p className="text-sm font-bold text-foreground">Pergunta principal</p>
                </div>
                <p className="mt-3 text-2xl font-black text-profit">Quanto sobrou limpo?</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Essa é a leitura que guia toda a experiência do produto.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {readingCards.map((card) => <FeatureCard key={card.title} card={card} />)}
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="relative px-4 py-20 sm:px-6">
        <div className="absolute inset-x-0 top-1/2 -z-10 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <SectionTitle
              eyebrow="Como funciona"
              title="Da boleia para o painel, do painel para a decisão."
              text="A experiência pública mostra a promessa. O app interno transforma a operação em leitura prática para quem roda."
            />
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {toolCards.map((card) => <FeatureCard key={card.title} card={card} />)}
            </div>
          </div>
          <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[2rem] border border-border/70 bg-black/75 p-4 shadow-2xl shadow-primary/5">
            <BinoImage
              src={BINO_ASSETS.usingPhoneMid}
              alt="Bino usando o celular com o Space Truck"
              fallbackLabel="Bino usando celular"
              className="max-h-[520px] w-full object-contain object-bottom drop-shadow-2xl"
            />
          </div>
        </div>
      </section>

      <section id="bino" className="px-4 py-20 sm:px-6">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Assistente virtual</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              Bino não entra como enfeite. Ele entra como copiloto.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              A função do Bino é explicar leituras, alertar sobre pontos importantes e ajudar o caminhoneiro a entender o que os números estão dizendo.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
                <FontAwesomeIcon icon={iconSparkles} className="mb-3 h-5 w-5 text-primary" />
                <p className="font-bold">Explica sem complicar</p>
                <p className="mt-1 text-sm text-muted-foreground">Nada de relatório confuso. A ideia é falar a língua da estrada.</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
                <FontAwesomeIcon icon={iconShield} className="mb-3 h-5 w-5 text-profit" />
                <p className="font-bold">Alerta com contexto</p>
                <p className="mt-1 text-sm text-muted-foreground">Custo alto, margem apertada, manutenção chegando e dados faltando.</p>
              </div>
            </div>
          </div>
          <BinoAssistantCard />
        </div>
      </section>

      <section id="pre-registro" className="px-4 py-20 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="overflow-hidden rounded-[2rem] border border-primary/20 bg-primary/10 p-6 lg:sticky lg:top-24">
            <div className="grid gap-6 sm:grid-cols-[1fr_0.65fr] sm:items-end lg:grid-cols-1">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Acesso antecipado</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-foreground">
                  Entre na lista e acompanhe a chegada do Space Truck.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  A liberação será feita aos poucos para testar com qualidade e ouvir caminhoneiros reais antes do lançamento geral.
                </p>
              </div>
              <div className="mx-auto w-full max-w-56 rounded-[1.5rem] bg-black/70 p-3">
                <BinoImage
                  src={BINO_ASSETS.welcome}
                  alt="Bino recebendo o usuário no acesso antecipado"
                  fallbackLabel="Bino boas-vindas"
                  className="max-h-72 w-full object-contain object-bottom drop-shadow-2xl"
                />
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {["Crie seu pré-registro", "Aguarde a liberação", "Teste na rotina real"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/70 p-3">
                  <FontAwesomeIcon icon={iconCheckCircle} className="h-4 w-4 text-profit" />
                  <span className="text-sm font-semibold">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-border/70 bg-secondary/30 p-5 shadow-2xl shadow-primary/5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-background p-4">
                <p className="text-xs text-muted-foreground">Nome ou apelido</p>
                <p className="mt-2 font-bold text-foreground">Como vamos te chamar</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background p-4">
                <p className="text-xs text-muted-foreground">WhatsApp/e-mail</p>
                <p className="mt-2 font-bold text-foreground">Canal para avisar liberação</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background p-4">
                <p className="text-xs text-muted-foreground">Perfil</p>
                <p className="mt-2 font-bold text-foreground">Autônomo, motorista ou frota</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background p-4">
                <p className="text-xs text-muted-foreground">Interesse principal</p>
                <p className="mt-2 font-bold text-foreground">Lucro, despesas, fretes ou manutenção</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-warning/20 bg-warning/10 p-4">
              <div className="flex items-start gap-3">
                <FontAwesomeIcon icon={iconLock} className="mt-0.5 h-4 w-4 text-warning" />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  O formulário funcional será conectado na próxima etapa do beta gate. Por enquanto, o caminho seguro é criar conta e preparar o status de acesso.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/register"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-[0.98]"
              >
                Criar meu pré-registro
                <FontAwesomeIcon icon={iconArrowRight} className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-2xl border border-border/70 bg-background px-5 py-4 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
              >
                Já tenho conta
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <SectionTitle
            eyebrow="Dúvidas rápidas"
            title="Transparência antes do lançamento."
            text="O acesso antecipado precisa ser claro para o caminhoneiro entender o que já está disponível e o que ainda está sendo preparado."
          />
          <div className="mt-10 grid gap-3 md:grid-cols-2">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-3xl border border-border/70 bg-secondary/35 p-5">
                <h3 className="font-bold text-foreground">{faq.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em]">Space Truck</p>
            <p className="mt-1 text-xs text-muted-foreground">Feito para a rotina real de quem vive na estrada.</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm font-semibold text-muted-foreground">
            <Link to="/login" className="hover:text-foreground">Entrar</Link>
            <a href="#pre-registro" className="hover:text-foreground">Acesso antecipado</a>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default LandingPage;
