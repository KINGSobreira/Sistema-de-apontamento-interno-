# Controle de Extras — Gestão de Horas Extras

Sistema web **independente** para controle, conferência, análise e gestão de horas extras. Importa relatórios operacionais em **PDF** (Mapa de Cobertura) e **Excel**, cruza as informações, identifica divergências, controla pagamentos e gera relatórios gerenciais.

> Plataforma independente de controle e gestão de horas extras — sem vínculo com a identidade visual de qualquer empresa.

---

## Funcionalidades

| Módulo | Descrição |
| --- | --- |
| **Dashboard** | KPIs executivos (total pago no mês anterior e no ano, pendente, divergências, atrasadas), gráficos de evolução mensal, distribuição por classificação e motivo, rankings de postos e colaboradores |
| **Importar Relatórios** | Leitura de PDF (Mapa de Cobertura) e Excel com mapeamento automático de colunas, prévia de conferência, validação de totais e controle de duplicidade |
| **Conferência Cruzada** | Cruzamento PDF × Excel identificando coincidentes, somente PDF, somente Excel e divergências de valor, quantidade e classificação |
| **Todas as Extras** | Tabela completa com pesquisa, filtros, ordenação, paginação, exportação e detalhes |
| **Pagamentos** | Totais pago, conferido, pendente e em divergência, por mês e por ano |
| **Extras Atrasadas** | Cálculo de dias para lançamento (DataInput − Data), classificação configurável e ranking de usuários |
| **Análises** | Rankings por colaborador, posto e motivo, e comparação entre dois períodos |
| **Relatórios** | 7 relatórios gerenciais exportáveis em PDF e Excel |
| **Histórico** | Rastreabilidade de todas as importações |
| **Usuários** | Dois perfis (Administrador e Conferência) com permissões aplicadas no banco |
| **Auditoria** | Log de todas as ações dos usuários |
| **Configurações** | Tabela de classificações editável, regras de atraso e parâmetros gerais |

## Tecnologias

- **Frontend:** React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui + Recharts
- **Backend/Banco:** Firebase (Authentication + Cloud Firestore)
- **Hospedagem:** Firebase Hosting (plano gratuito)
- **Processamento:** 100% no navegador (pdf.js, SheetJS, jsPDF)

## Início rápido

```bash
# 1. Instalar dependências
pnpm install

# 2. Configurar Firebase (veja GUIA-DEPLOY.md)
cp .env.example .env
# edite o .env com as credenciais do seu projeto Firebase

# 3. Rodar em desenvolvimento
pnpm dev

# 4. Build de produção
pnpm build

# 5. Deploy no Firebase Hosting
firebase deploy
```

## Documentação

- **[GUIA-DEPLOY.md](./GUIA-DEPLOY.md)** — Passo a passo completo: criar projeto Firebase, subir no GitHub e colocar o site no ar.
- **[GUIA-USO.md](./GUIA-USO.md)** — Como usar o sistema: primeiro acesso, importações, conferência e relatórios.

## Estrutura

```
client/src/
  components/     Layout, filtros, UI (shadcn)
  contexts/       AuthContext (login/perfis), DataContext (dados)
  lib/            firebase, firestore, parsers (PDF/Excel), cruzamento, tipos, utils
  pages/          Dashboard, Importar, Extras, Pagamentos, Análises,
                  Atrasadas, Divergências, Relatórios, Histórico,
                  Usuários, Configurações, Auditoria, Login
firebase.json     Configuração do Firebase Hosting
firestore.rules   Regras de segurança do banco (permissões por perfil)
```

## Segurança

- Autenticação por e-mail/senha via Firebase Authentication
- Senhas com hash seguro (gerenciado pelo Firebase, nunca em texto puro)
- Regras do Firestore aplicam permissões no servidor: usuário de conferência **não consegue** escrever mesmo alterando a URL ou fazendo requisições manuais
- Todas as ações registradas em auditoria
