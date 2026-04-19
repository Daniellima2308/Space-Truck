import type { Meta, StoryObj } from "@storybook/react-vite";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const meta = {
  title: "Components/Navigation/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  args: {
    defaultValue: "overview",
  },
} satisfies Meta<typeof Tabs>;

export default meta;

type Story = StoryObj<typeof meta>;

const tabContentClassName = "rounded-md border bg-card p-3 text-sm text-muted-foreground";

export const Default: Story = {
  render: (args) => (
    <Tabs {...args} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview">Resumo</TabsTrigger>
        <TabsTrigger value="costs">Custos</TabsTrigger>
        <TabsTrigger value="alerts">Alertas</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className={tabContentClassName}>
        Rota dentro do planejado para hoje.
      </TabsContent>
      <TabsContent value="costs" className={tabContentClassName}>
        Combustível representa 62% do custo atual.
      </TabsContent>
      <TabsContent value="alerts" className={tabContentClassName}>
        Próxima parada recomendada em 45 minutos.
      </TabsContent>
    </Tabs>
  ),
};

export const WithDisabledItem: Story = {
  render: (args) => (
    <Tabs {...args} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="open">Abertos</TabsTrigger>
        <TabsTrigger value="closed">Concluídos</TabsTrigger>
        <TabsTrigger value="blocked" disabled>
          Bloqueados
        </TabsTrigger>
      </TabsList>
      <TabsContent value="open" className={tabContentClassName}>
        2 viagens aguardando confirmação.
      </TabsContent>
      <TabsContent value="closed" className={tabContentClassName}>
        6 viagens fechadas nesta semana.
      </TabsContent>
    </Tabs>
  ),
  args: {
    defaultValue: "open",
  },
};
