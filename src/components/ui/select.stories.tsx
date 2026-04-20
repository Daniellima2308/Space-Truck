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
      <Select defaultValue="volvo">
        <SelectTrigger className="bg-secondary border-none text-sm h-[42px]">
          <SelectValue placeholder="Marca" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="volvo">Volvo</SelectItem>
          <SelectItem value="scania">Scania</SelectItem>
          <SelectItem value="mercedes">Mercedes-Benz</SelectItem>
        </SelectContent>
      </Select>

      <Select defaultValue="fh-540">
        <SelectTrigger className="bg-secondary border-none text-sm h-[42px]">
          <SelectValue placeholder="Modelo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="fh-540">FH 540</SelectItem>
          <SelectItem value="fh-460">FH 460</SelectItem>
          <SelectItem value="__custom">Outro modelo...</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const MaintenanceVehiclePickerOpen: Story = {
  render: () => (
    <Select defaultValue="v1" defaultOpen>
      <SelectTrigger className="bg-secondary border-none text-sm h-[42px]">
        <SelectValue placeholder="Selecione o veículo" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="v1">Volvo FH 540 - ABC1D23</SelectItem>
        <SelectItem value="v2">Scania R450 - DEF4G56</SelectItem>
        <SelectItem value="v3">Mercedes Axor - GHI7J89</SelectItem>
      </SelectContent>
    </Select>
  ),
};
