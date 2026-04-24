import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "App Patterns/Forms/Input Field",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const EmailField: Story = {
  render: () => (
    <div className="space-y-2">
      <label htmlFor="storybook-email" className="text-sm font-medium text-foreground">
        E-mail
      </label>
      <input
        id="storybook-email"
        className="input-field w-full text-base py-3.5 rounded-xl"
        type="email"
        placeholder="E-mail"
        defaultValue="motorista@space.truck"
      />
    </div>
  ),
};

export const VehicleFields: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <label htmlFor="storybook-plate" className="text-sm font-medium text-foreground">
          Placa
        </label>
        <input
          id="storybook-plate"
          className="input-field uppercase font-mono"
          placeholder="Placa (ABC1D23)"
          defaultValue="ABC1D23"
          maxLength={7}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="storybook-current-km" className="text-sm font-medium text-foreground">
          KM Atual do Painel
        </label>
        <input
          id="storybook-current-km"
          className="input-field"
          placeholder="KM Atual do Painel"
          type="number"
          inputMode="numeric"
          defaultValue="540000"
        />
      </div>
    </div>
  ),
};

export const CommissionPercent: Story = {
  render: () => (
    <div className="space-y-2">
      <label htmlFor="storybook-commission" className="text-sm font-medium text-foreground">
        Percentual padrão de comissão
      </label>
      <input
        id="storybook-commission"
        className="input-field w-full"
        placeholder="Percentual padrão de comissão (%)"
        type="number"
        min="0"
        max="100"
        step="0.1"
        defaultValue="12.5"
      />
    </div>
  ),
};
