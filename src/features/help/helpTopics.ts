export type HelpTopicCategory =
  | "trip"
  | "finance"
  | "vehicle"
  | "fueling"
  | "expense"
  | "route"
  | "account"
  | "receivable";

export type HelpTopic = {
  id: string;
  title: string;
  description: string;
  category: HelpTopicCategory;
  steps: string[];
};

export const helpTopics: HelpTopic[] = [
  {
    id: "finish-trip",
    title: "Não consigo finalizar uma viagem",
    description: "Confira os dados obrigatórios antes de encerrar a operação.",
    category: "trip",
    steps: [
      "Abra a viagem ativa e revise se os fretes, despesas e abastecimentos principais foram registrados.",
      "Confira se o veículo selecionado é o mesmo da viagem.",
      "Informe a quilometragem final quando o app solicitar.",
      "Se o botão continuar bloqueado, registre o que aparece na tela e abra um atendimento.",
    ],
  },
  {
    id: "wrong-profit",
    title: "Meu lucro ou saldo parece errado",
    description: "Entenda quais dados entram na leitura financeira da viagem.",
    category: "finance",
    steps: [
      "Revise o valor dos fretes vinculados à viagem.",
      "Confira despesas, abastecimentos e comissão configurada.",
      "Veja se existe algum lançamento duplicado.",
      "Se ainda parecer errado, abra atendimento informando a viagem e o valor esperado.",
    ],
  },
  {
    id: "register-vehicle",
    title: "Como cadastrar um veículo",
    description: "Cadastre o caminhão para organizar viagens, manutenção e leituras.",
    category: "vehicle",
    steps: [
      "Entre em Veículos.",
      "Toque para adicionar um novo veículo.",
      "Preencha placa, modelo e quilometragem inicial.",
      "Use uma quilometragem real, porque ela alimenta alertas de manutenção.",
    ],
  },
  {
    id: "register-fueling",
    title: "Como registrar abastecimento",
    description: "Mantenha o custo da viagem atualizado com abastecimentos corretos.",
    category: "fueling",
    steps: [
      "Abra a viagem ou área onde o abastecimento será lançado.",
      "Informe valor, litros, posto e data quando disponível.",
      "Confira se o abastecimento está ligado à viagem certa.",
      "Revise o total da viagem após salvar.",
    ],
  },
  {
    id: "register-expense",
    title: "Como registrar despesa",
    description: "Lance pedágio, alimentação, manutenção e outras despesas da estrada.",
    category: "expense",
    steps: [
      "Abra a viagem relacionada à despesa.",
      "Escolha o tipo correto de despesa.",
      "Informe valor, data e observação quando fizer sentido.",
      "Evite lançar a mesma despesa duas vezes.",
    ],
  },
  {
    id: "route-toll-error",
    title: "Problema com rota, distância ou pedágio",
    description: "Saiba o que conferir quando cálculo de rota parecer estranho.",
    category: "route",
    steps: [
      "Confira se origem e destino estão escritos corretamente.",
      "Evite abreviações confusas no nome da cidade.",
      "Verifique sua conexão antes de recalcular.",
      "Se o valor ainda parecer errado, abra atendimento informando origem, destino e tipo de veículo.",
    ],
  },
  {
    id: "login-issue",
    title: "Não consigo fazer login",
    description: "Confira os caminhos mais comuns para recuperar o acesso.",
    category: "account",
    steps: [
      "Confirme se está usando o mesmo método de login de antes.",
      "Se usou Google, entre pelo botão do Google.",
      "Se usou e-mail e senha, tente recuperar a senha.",
      "Se continuar sem acesso, abra atendimento com o e-mail da conta.",
    ],
  },
  {
    id: "receivables",
    title: "Como usar contas a receber",
    description: "Organize cobranças e recebimentos sem misturar com a viagem.",
    category: "receivable",
    steps: [
      "Registre o valor que precisa receber.",
      "Vincule à viagem ou frete quando fizer sentido.",
      "Atualize o status quando receber.",
      "Use essa área como controle, não como substituto do comprovante oficial.",
    ],
  },
];
