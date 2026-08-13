# Controle de Extras — Direção de Design

## Abordagem Escolhida: **"Console Operacional Verde"**

Um sistema de gestão corporativa com alma de ferramenta de precisão — limpo, denso em informação sem ser poluído, com verde institucional como assinatura. A estética remete a painéis de controle profissionais: dados claros, hierarquia rigorosa, zero ruído visual.

---

## Design Movement
**Swiss/International Typographic Style** aplicado a dashboards corporativos — grid rigoroso, tipografia como elemento estrutural, cor usada com parcimônia cirúrgica.

## Core Principles
1. **Dados primeiro** — cada pixel serve à legibilidade dos números
2. **Hierarquia por peso, não por cor** — cinzas estruturam, verde só destaca ação/valor
3. **Densidade controlada** — tabelas ricas, mas com respiro e ritmo vertical
4. **Confiança institucional** — visual que transmite precisão contábil

## Color Philosophy
Verde = valor, ação, confirmação, dinheiro controlado. Cinza = estrutura, neutralidade, apoio. Branco = clareza, espaço de leitura. O verde nunca compete consigo mesmo — há UM verde primário (#005A39) e seus tons derivados. Vermelho/âmbar aparecem APENAS para divergência/alerta (semântica universal).

**Paleta:**
- Primário: `#005A39` (verde floresta profundo)
- Primário claro: `#008163` (verde médio — hover, gráficos)
- Acento suave: `#E6F4EF` (verde 5% — fundos de destaque)
- Sucesso: `#16a34a` | Alerta: `#d97706` | Perigo: `#dc2626`
- Neutros: `#0f172a` (texto), `#475569` (secundário), `#94a3b8` (terciário), `#e2e8f0` (bordas), `#f8fafc` (fundo)

## Layout Paradigm
**Sidebar fixa escura (verde profundo) + área de conteúdo clara.** Dashboard em grid assimétrico de 12 colunas: KPIs em cards na primeira linha, gráficos ocupando 2/3 + 1/3, tabelas full-width. Nada de tudo centralizado — o conteúdo flui da esquerda com alinhamento rigoroso à grade.

## Signature Elements
1. **Barra lateral verde-escura** com item ativo em verde vivo + indicador de 3px à esquerda
2. **Cards KPI com número grande tabular** (font-variant-numeric: tabular-nums) e micro-sparkline
3. **Badges de status em pill** com ponto colorido (●) + texto
4. **Cabeçalho de página com breadcrumb discreto** e ações à direita

## Interaction Philosophy
Interações rápidas e silenciosas — hover sutil (elevação 1px + sombra), transições ≤200ms, feedback imediato em ações (toast). Nada de animações decorativas; o movimento existe para confirmar, não para entreter.

## Typography System
- **Display/Números:** "Sora" (700/600) — moderna, geométrica, excelente para KPIs
- **Corpo/UI:** "Inter" (400/500/600) — legibilidade máxima em tabelas
- Números monetários sempre com `tabular-nums` para alinhamento em coluna
- Escala: 28/20/16/14/13/12px

## Brand Essence
Ferramenta independente de gestão de horas extras para quem precisa de precisão e rastreabilidade. Adjetivos: **preciso, confiável, sóbrio**.

## Brand Voice
Direto, técnico, sem jargão desnecessário. Ex.: "64,90 unidades conferidas" / "3 divergências encontradas neste período".

## Wordmark & Logo
**"Controle de Extras"** em Sora 700, com um símbolo geométrico: um quadrado verde com um relógio/check estilizado formando um "C" negativo. Favicon = o símbolo isolado.

## Signature Brand Color
`#005A39` — verde floresta institucional, inconfundível.
