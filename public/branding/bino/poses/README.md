# Bino poses

Pasta oficial para poses do Bino usadas no app, landing page, telas de espera, onboarding e materiais públicos.

## Estrutura oficial

```text
public/branding/bino/poses/
  3d/
    corpo-inteiro/
    meio-corpo/
    close/
  2d/
    corpo-inteiro/
    meio-corpo/
    close/
```

## Critérios

### `3d/corpo-inteiro/`
Use para poses 3D em que o Bino aparece inteiro, da cabeça aos pés.

Exemplos:
- Bino em pé de braços cruzados;
- Bino corpo inteiro apontando;
- Bino corpo inteiro em gesto de boas-vindas;
- Bino corpo inteiro usando celular.

### `3d/meio-corpo/`
Use para poses 3D em enquadramento 3/4, busto, cintura para cima ou tronco predominante.

Exemplos:
- Bino mostrando celular em destaque;
- Bino usando celular com enquadramento médio;
- Bino apresentando cards ou painel.

### `3d/close/`
Use para imagens 3D próximas do rosto, cabeça, expressão facial ou recortes fechados.

Exemplos:
- rosto do Bino;
- expressão de alerta;
- expressão acolhedora;
- close com celular.

### `2d/corpo-inteiro/`
Use para poses 2D em que o Bino aparece inteiro.

### `2d/meio-corpo/`
Use para poses 2D em enquadramento 3/4, busto, cintura para cima ou tronco predominante.

### `2d/close/`
Use para imagens 2D próximas do rosto, cabeça ou expressão facial.

## Regras de nome

- tudo em minúsculo;
- usar hífen;
- sem espaços;
- sem acentos;
- não usar `final`, `novo`, `teste`, `v1`, `v2` como nome principal;
- o nome deve descrever a função da pose.

## Exemplos válidos

```text
bino-hero-phone.png
bino-assistant-pointing.png
bino-welcome-open-hands.png
bino-confident-crossed-arms.png
bino-using-phone-mid.png
bino-using-phone-close.png
```

## Observação de migração

As subpastas legadas `bino-1/`, `bino-2/` e `bino-3/` podem existir temporariamente como entrada histórica de assets.

Quando um asset for promovido para uso real em tela, mova para uma das pastas oficiais acima e mantenha o nome descritivo.
