# Space Truck — Marca Principal

Pasta reservada para os assets oficiais da **marca principal** do app: **SPACE TRUCK**.

> **Status:** estrutura preparada. Os arquivos PNG ainda **não** estão no repositório.
> Eles serão adicionados manualmente. Esta estrutura **não** afeta o runtime do app.

---

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `logo/` | Logo completo (símbolo + wordmark), com e sem slogan |
| `simbolo/` | Símbolo isolado, sem texto |
| `wordmark/` | Apenas o texto "SPACE TRUCK" |
| `slogan/` | Apenas a frase institucional/slogan |
| `icone/` | Versão quadrada/arredondada para ícone de app e atalhos |
| `reference/` | Referências visuais, guias e materiais de apoio |

---

## Convenção de nomenclatura

`space-truck-[tipo]-[variacao]-[cor].png`

### Tipos oficiais
- `logo` — composição completa
- `simbolo` — símbolo isolado
- `wordmark` — texto isolado
- `slogan` — frase institucional
- `icone` — ícone para app

### Variações
- `principal` — versão padrão
- `com-slogan` — versão com slogan (usado em `logo/`)
- `horizontal` — layout horizontal (usado em `wordmark/`)
- `vertical` — layout vertical (usado em `wordmark/`)
- `app` — formatado para ícone de aplicativo (usado em `icone/`)
- `neon` — versão com efeito neon (usado em `icone/`)

### Cores
- `branco` — para fundos escuros
- `preto` — para fundos claros
- `neon` — versão com iluminação/efeito neon

---

## Arquivos oficiais esperados

### logo/
- `space-truck-logo-principal-branco.png`
- `space-truck-logo-principal-preto.png`
- `space-truck-logo-principal-com-slogan-branco.png`
- `space-truck-logo-principal-com-slogan-preto.png`

### simbolo/
- `space-truck-simbolo-isolado-branco.png`
- `space-truck-simbolo-isolado-preto.png`

### wordmark/
- `space-truck-wordmark-horizontal-branco.png`
- `space-truck-wordmark-horizontal-preto.png`
- `space-truck-wordmark-vertical-branco.png`
- `space-truck-wordmark-vertical-preto.png`

### slogan/
- `space-truck-slogan-branco.png`
- `space-truck-slogan-preto.png`

### icone/
- `space-truck-icone-principal-fundo-preto.png`
- `space-truck-icone-principal-fundo-branco.png`
- `space-truck-icone-app-neon.png`

---

## Regras gerais
- Tudo em minúsculo, com hífen como separador
- Sem espaços, sem acentos, sem nomes vagos (`final`, `novo`, `v2`)
- Não misturar assets da marca Space Truck com assets do personagem Bino
- Space Truck é a **marca principal**; Bino é um personagem/assistente separado

---

## Quando usar branco ou preto?

| Situação | Usar |
|---|---|
| Fundo escuro / dark background | `branco` |
| Fundo claro / light background | `preto` |
| Ícone de app com destaque neon | `neon` |

## Quando usar horizontal ou vertical?

| Situação | Usar |
|---|---|
| Espaços largos (header, banner) | `horizontal` |
| Espaços altos ou quadrados | `vertical` |
