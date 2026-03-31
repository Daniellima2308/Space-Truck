# Branding assets

Estrutura oficial dos assets de branding do projeto **SPACE TRUCK**.

> **Status desta estrutura:** preparada para receber os arquivos PNG.
> Os PNGs ainda **não** estão no repositório e serão adicionados manualmente.
> Esta estrutura **não** altera o runtime do app.

---

## Arquitetura de marca

| Pasta | Descrição |
|---|---|
| `space-truck/` | **Marca principal oficial** do app (nova identidade) |
| `bino/` | Personagem/assistente do app (domínio separado da marca) |
| `sentinela/` | Identidade anterior — mantida como referência histórica |
| `reference/` | Material de referência visual geral para consulta |

---

## Marca principal: SPACE TRUCK

A marca `space-truck/` é a identidade visual oficial do produto.
Seus assets estão organizados em sub-pastas temáticas:

| Sub-pasta | Conteúdo |
|---|---|
| `logo/` | Símbolo + wordmark (composição completa) |
| `simbolo/` | Símbolo isolado, sem wordmark |
| `wordmark/` | Apenas o texto "SPACE TRUCK" |
| `slogan/` | Apenas a frase institucional/slogan |
| `icone/` | Versão quadrada para ícone de app |
| `reference/` | Referências visuais e materiais de apoio |

Convenção de nomenclatura dos arquivos:
`space-truck-[tipo]-[variacao]-[cor].png`

Cores oficiais: `branco`, `preto`, `neon`

---

## Personagem: Bino

O Bino é o assistente visual do app, **não substitui** a marca principal.
Seus assets ficam exclusivamente em `bino/`:

| Sub-pasta | Conteúdo |
|---|---|
| `official/` | Versões oficiais base do personagem |
| `poses/` | Poses derivadas do personagem |
| `expressions/` | Expressões faciais e variações |

---

## Regras gerais de nomenclatura

- Tudo em minúsculo
- Usar hífen (`-`) como separador
- Sem espaços, sem acentos
- Sem nomes vagos (`final`, `novo`, `teste`, `v2`)
- Não misturar assets da marca com assets do Bino

---

## Legado

- `sentinela/` = identidade anterior do projeto. Mantida como referência, não removida.
- `reference/` = material visual geral de apoio.
