# Guia de Uso — Controle de Extras

Manual rápido para operar o sistema no dia a dia.

---

## 1. Perfis de acesso

| Perfil | O que pode fazer |
| --- | --- |
| **Administrador** | Acesso completo: importar, editar, excluir, alterar status, gerenciar usuários e configurações |
| **Conferência** | Somente consulta: dashboard, tabelas, análises, divergências e relatórios de leitura |

O primeiro usuário cadastrado no Firebase Authentication vira **Administrador** automaticamente. Os demais são criados em **Configurações → Usuários**.

---

## 2. Fluxo principal de trabalho

### Passo 1 — Importar o PDF

1. Acesse **Importar Relatórios** (menu lateral).
2. Clique em **"Importar Relatório PDF"** e selecione o Mapa de Cobertura.
3. O sistema processa e mostra a **prévia**: quantidade de registros, unidades, valor total, novos e duplicados.
4. Confira a **validação de totais**: o sistema compara o total calculado com o TOTAL GERAL do relatório e avisa se bate (ex.: `64,90 unidades / R$ 9.945,47 — Conferido`).

### Passo 2 — Cruzar com o Excel (opcional, recomendado)

1. Ainda na tela de prévia do PDF, clique em **"Cruzar com Excel"**.
2. Selecione a planilha do **mesmo período**.
3. O sistema mostra a **conferência cruzada**:
   - **Coincidentes** — existem nos dois arquivos
   - **Somente no PDF** — não localizados no Excel
   - **Somente no Excel** — não localizados no PDF
   - **Divergências** — de valor, quantidade ou classificação, com a diferença destacada

### Passo 3 — Confirmar a importação

1. Clique em **"Confirmar importação"**.
2. Registros **duplicados são ignorados automaticamente** — o sistema nunca grava o mesmo registro duas vezes (a chave usa data + colaborador + substituto + posto + motivo + classificação + quantidade).
3. O **dashboard é atualizado** na hora.

> Você também pode importar **somente o Excel** diretamente. O sistema identifica as colunas automaticamente (incluindo `DATA`, `DATAINPUT` e `USUARIO` quando existirem) e mostra o mapeamento antes de salvar.

---

## 3. Entendendo as telas

### Dashboard
Visão executiva: total pago no mês anterior e no ano (considera apenas status **Pago**), valor total, pendente, quantidade de extras, colaboradores, postos, divergências e atrasadas. Os **filtros** no topo atualizam todos os indicadores e gráficos.

> Os indicadores pessoais consideram apenas dados a partir de **22/05/2026** (configurável em Configurações → Geral).

### Todas as Extras
Tabela completa com pesquisa, ordenação (clique no título da coluna), paginação e exportação em Excel. O **admin** altera o status direto na tabela e pode excluir registros.

### Pagamentos
Totais por status (pago, conferido, pendente, divergência), gráfico mensal empilhado e total pago por ano.

### Extras Atrasadas
Calcula **dias para lançamento = DataInput − Data** (precisa do Excel com essas colunas). Classificação padrão: 0–1 dia no prazo, 2–3 atenção, 4+ atrasada (limites configuráveis). Inclui o **ranking de usuários que mais lançam atrasadas**.

### Divergências
Mostra os registros com divergência, os exclusivos de cada fonte e os coincidentes PDF + Excel.

### Análises
Rankings por colaborador, posto e motivo, e a ferramenta **Comparar Períodos** (selecione dois intervalos e veja a variação).

### Relatórios
7 relatórios gerenciais (financeiro, operacional, por motivo, por colaborador, por posto, atrasadas e divergências), exportáveis em **PDF** e **Excel** com os filtros aplicados.

---

## 4. Classificações e valores

Os valores das classificações ficam em **Configurações → Classificações** (somente admin):

| Código | Local | Período | Valor padrão |
| --- | --- | --- | --- |
| 1 | Capital | Diurno | R$ 145,72 |
| 2 | Capital | Noturno | R$ 170,54 |
| 3 | Interior | Diurno | R$ 136,72 |
| 4 | Interior | Noturno | R$ 161,54 |

O sistema calcula automaticamente: **classificação × quantidade** (com proporcional para quantidades fracionadas, ex.: 0,90). No Excel, a classificação é identificada pelo **valor da hora**. Se os valores mudarem no futuro, basta editar na tela — sem mexer no código.

---

## 5. Regras importantes do sistema

- **Nada é inventado:** campos ausentes no arquivo aparecem como "Não informado".
- **Revisão necessária:** registros com interpretação duvidosa são marcados para conferência manual.
- **Rastreabilidade total:** cada registro guarda a origem (PDF, Excel ou PDF + Excel), o arquivo de origem e a data da importação. O histórico completo fica em **Histórico de Importações** e as ações dos usuários em **Auditoria**.
- **Sem duplicidade:** a mesma extra nunca é gravada duas vezes, mesmo importando PDF e Excel do mesmo período.
