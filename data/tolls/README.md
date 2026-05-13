# Fontes da base própria de pedágios do Space Truck

Coloque aqui os arquivos brutos ou exportados da base auditada de pedágios.

Use nomes neutros e oficiais do Space Truck. Evite nomes com versão de auditoria, como `v26`, porque a versão do documento não deve virar nome público no código do app.

## Arquivos recomendados

Preferencialmente envie pelo menos um destes arquivos:

- `space_truck_toll_base_active_points.csv`
- `space_truck_toll_base_active_points.xlsx`
- `space_truck_toll_base_audit.xlsx`

Se houver mais de uma aba ou documento, mantenha todos nesta pasta.

## Campos esperados para conversão em código

A conversão para o app deve conseguir identificar, quando disponíveis:

- identificador da praça;
- nome da praça;
- UF;
- regulador;
- jurisdição;
- concessionária;
- rodovia;
- km;
- município;
- sentido;
- latitude;
- longitude;
- tarifas por eixo de 2 a 9;
- status operacional;
- indicação se a linha calcula pedágio;
- confiança geográfica;
- confiança de valor;
- fontes e URLs de referência.

## Regra de uso

Somente as praças ativas e marcadas para calcular pedágio devem virar código em `src/lib/tollData`.

Os documentos desta pasta são fonte bruta/auditada. O app não deve importar diretamente arquivos desta pasta em runtime.
