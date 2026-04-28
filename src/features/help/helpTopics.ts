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

const createHelpTopic = (
  id: string,
  title: string,
  description: string,
  category: HelpTopicCategory,
  steps: string[],
): HelpTopic => ({ id, title, description, category, steps });

export const helpTopics: HelpTopic[] = [
  createHelpTopic(
    "finish-trip",
    "Não consigo finalizar uma viagem",
    "Confira os dados obrigatórios antes de encerrar a operação.",
    "trip",
    [
      "Abra a viagem ativa e revise se os fretes, despesas e abastecimentos principais foram registrados.",
      "Confira se o veículo selecionado é o mesmo da viagem.",
      "Informe a quilometragem final quando o app solicitar.",
      "Se o botão continuar bloqueado, registre o que aparece na tela e abra um atendimento.",
    ],
  ),
  createHelpTopic(
    "wrong-profit",
    "Meu lucro ou saldo parece errado",
    "Entenda quais dados entram na leitura financeira da viagem.",
    "finance",
    [
      "Revise o valor dos fretes vinculados à viagem.",
      "Confira despesas, abastecimentos e comissão configurada.",
      "Veja se existe algum lançamento duplicado.",
      "Se ainda parecer errado, abra atendimento informando a viagem e o valor esperado.",
    ],
  ),
  createHelpTopic(
    "register-vehicle",
    "Como cadastrar um veículo",
    "Cadastre o caminhão para organizar viagens, manutenção e leituras.",
    "vehicle",
    [
      "Entre em Veículos.",
      "Toque para adicionar um novo veículo.",
      "Preencha placa, modelo e quilometragem inicial.",
      "Use uma quilometragem real, porque ela alimenta alertas de manutenção.",
    ],
  ),
  createHelpTopic(
    "register-fueling",
    "Como registrar abastecimento",
    "Mantenha o custo da viagem atualizado com abastecimentos corretos.",
    "fueling",
    [
      "Abra a viagem ou área onde o abastecimento será lançado.",
      "Informe valor, litros, posto e data quando disponível.",
      "Confira se o abastecimento está ligado à viagem certa.",
      "Revise o total da viagem após salvar.",
    ],
  ),
  createHelpTopic(
    "register-expense",
    "Como registrar despesa",
    "Lance pedágio, alimentação, manutenção e outras despesas da estrada.",
    "expense",
    [
      "Abra a viagem relacionada à despesa.",
      "Escolha o tipo correto de despesa.",
      "Informe valor, data e observação quando fizer sentido.",
      "Evite lançar a mesma despesa duas vezes.",
    ],
  ),
  createHelpTopic(
    "route-toll-error",
    "Problema com rota, distância ou pedágio",
    "Saiba o que conferir quando cálculo de rota parecer estranho.",
    "route",
    [
      "Confira se origem e destino estão escritos corretamente.",
      "Evite abreviações confusas no nome da cidade.",
      "Verifique sua conexão antes de recalcular.",
      "Se o valor ainda parecer errado, abra atendimento informando origem, destino e tipo de veículo.",
    ],
  ),
  createHelpTopic(
    "login-issue",
    "Não consigo fazer login",
    "Confira os caminhos mais comuns para recuperar o acesso.",
    "account",
    [
      "Confirme se está usando o mesmo método de login de antes.",
      "Se usou Google, entre pelo botão do Google.",
      "Se usou e-mail e senha, tente recuperar a senha.",
      "Se continuar sem acesso, abra atendimento com o e-mail da conta.",
    ],
  ),
  createHelpTopic(
    "receivables",
    "Como usar contas a receber",
    "Organize cobranças e recebimentos sem misturar com a viagem.",
    "receivable",
    [
      "Registre o valor que precisa receber.",
      "Vincule à viagem ou frete quando fizer sentido.",
      "Atualize o status quando receber.",
      "Use essa área como controle, não como substituto do comprovante oficial.",
    ],
  ),
];
