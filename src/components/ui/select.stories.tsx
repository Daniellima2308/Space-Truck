import type { Meta, StoryObj } from "@storybook/react-vite";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const meta = {
  title: "Foundation/Forms/Select",
  component: Select,
  tags: ["autodocs"],
} satisfies Meta<typeof Select>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DashboardVehicleFilter: Story = {
  render: () => (
    <Select defaultValue="all">
      <SelectTrigger className="w-full bg-secondary border-none text-sm h-[42px]">
        <SelectValue placeholder="Todos os Veículos" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os Veículos</SelectItem>
        <SelectItem value="v1">ABC1D23 • Volvo FH</SelectItem>
        <SelectItem value="v2">DEF4G56 • Scania R450</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const VehicleBrandAndModel: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-3">
      <Select defaultValue="Volvo">
        <SelectTrigger className="bg-secondary border-none text-sm h-[42px]">
          <SelectValue placeholder="Marca" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Mercedes-Benz">Mercedes-Benz</SelectItem>
          <SelectItem value="Scania">Scania</SelectItem>
          <SelectItem value="Volvo">Volvo</SelectItem>
        </SelectContent>
      </Select>

      <Select defaultValue="FH 540">
        <SelectTrigger className="bg-secondary border-none text-sm h-[42px]">
          <SelectValue placeholder="Modelo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="FH 400">FH 400</SelectItem>
          <SelectItem value="FH 440">FH 440</SelectItem>
          <SelectItem value="FH 540">FH 540</SelectItem>
          <SelectItem value="__custom">Outro modelo...</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const MaintenanceVehiclePicker: Story = {
  render: () => (
    <Select defaultValue="v1">
      <SelectTrigger className="bg-secondary border-none text-sm h-[42px]">
        <SelectValue placeholder="Selecione o veículo" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="v1">Volvo FH - ABC1D23</SelectItem>
        <SelectItem value="v2">Scania R450 - DEF4G56</SelectItem>
        <SelectItem value="v3">Mercedes-Benz Axor 2544 - GHI7J89</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const MaintenanceServiceType: Story = {
  render: () => (
    <Select defaultValue="Óleo de Motor">
      <SelectTrigger className="bg-secondary border-none text-sm h-[42px]">
        <SelectValue placeholder="Tipo de Serviço" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Óleo de Motor">Óleo de Motor</SelectItem>
        <SelectItem value="Filtro de Óleo">Filtro de Óleo</SelectItem>
        <SelectItem value="Lonas de Freio">Lonas de Freio</SelectItem>
        <SelectItem value="Outro">Outro</SelectItem>
      </SelectContent>
    </Select>
  ),
};
