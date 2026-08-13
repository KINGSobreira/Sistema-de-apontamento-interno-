# Guia Completo — GitHub + Firebase (colocar o site no ar)

Este guia te leva do zero até o sistema **no ar**, com o código salvo no seu GitHub. São 4 etapas. Tempo estimado: **20 a 30 minutos**.

---

## O que você vai precisar

1. Uma conta no **Google** (para o Firebase — gratuito)
2. Uma conta no **GitHub** (gratuita)
3. **Node.js** instalado no computador (versão 18 ou superior) — [baixar aqui](https://nodejs.org/)
4. **Git** instalado — [baixar aqui](https://git-scm.com/downloads)

> **Importante:** tudo neste guia usa os planos **gratuitos** do GitHub e do Firebase (plano "Spark"). Não é preciso cartão de crédito.

---

# ETAPA 1 — Criar o projeto no Firebase

## 1.1. Criar o projeto

1. Acesse o **Console do Firebase**: <https://console.firebase.google.com/>
2. Clique em **"Adicionar projeto"** (ou "Criar um projeto").
3. Nome do projeto: `controle-extras` (ou o nome que preferir) → **Continuar**.
4. Na tela do Google Analytics, pode **desativar** (não é necessário) → **Criar projeto**.
5. Aguarde a criação e clique em **Continuar**.

## 1.2. Ativar a Autenticação (login)

1. No menu lateral esquerdo, clique em **"Authentication"** (Autenticação).
2. Clique em **"Começar"** (Get started).
3. Na aba **"Sign-in method"**, clique em **"E-mail/senha"**.
4. Ative a **primeira opção** (E-mail/senha) → **Salvar**.

## 1.3. Criar o banco de dados (Firestore)

1. No menu lateral, clique em **"Firestore Database"**.
2. Clique em **"Criar banco de dados"**.
3. Selecione **"Iniciar no modo de produção"** → **Avançar**.
4. Localização: escolha **`southamerica-east1 (São Paulo)`** → **Ativar**.

## 1.4. Publicar as regras de segurança

1. Ainda no **Firestore Database**, clique na aba **"Regras"**.
2. **Apague todo o conteúdo** e cole o conteúdo do arquivo **`firestore.rules`** (está na raiz deste projeto).
3. Clique em **"Publicar"**.

## 1.5. Registrar o app da Web e copiar as credenciais

1. No menu lateral, clique na **engrenagem** (⚙️) → **"Configurações do projeto"**.
2. Role até **"Seus apps"** e clique no ícone **`</>`** (Web).
3. Nome do app: `controle-extras-web` → **Registrar app**.
4. O Firebase vai mostrar um bloco `firebaseConfig` com várias chaves. **Deixe essa tela aberta** — você vai copiar esses valores na Etapa 3.

## 1.6. Ativar o Hosting

1. No menu lateral, clique em **"Hosting"**.
2. Clique em **"Começar"** e avance até o fim (não precisa executar os comandos que ele sugere — faremos isso depois).

---

# ETAPA 2 — Subir o código no GitHub

## 2.1. Criar o repositório

1. Acesse <https://github.com/new>.
2. **Repository name:** `controle-extras`
3. Deixe como **Private** (recomendado) ou Public.
4. **NÃO** marque "Add a README" (o projeto já tem um).
5. Clique em **"Create repository"**.

## 2.2. Enviar o código

Abra o terminal (Prompt de Comando / PowerShell no Windows, Terminal no Mac/Linux) **na pasta do projeto** e execute:

```bash
# Inicializar o git (se ainda não foi feito)
git init

# Adicionar todos os arquivos
git add .

# Criar o primeiro commit
git commit -m "Sistema Controle de Extras - versão inicial"

# Conectar ao seu repositório (TROQUE 'seu-usuario' pelo seu usuário do GitHub)
git remote add origin https://github.com/seu-usuario/controle-extras.git

# Renomear a branch para main
git branch -M main

# Enviar o código
git push -u origin main
```

> Na primeira vez, o Git vai pedir seu login do GitHub. Use um **Personal Access Token** como senha (o GitHub não aceita mais senha normal). Para criar: GitHub → sua foto → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token** → marque a caixa **`repo`** → gere e copie.

Pronto! Seu código está salvo no GitHub. Sempre que fizer alterações, repita: `git add .` → `git commit -m "descrição"` → `git push`.

---

# ETAPA 3 — Configurar as credenciais do Firebase no projeto

## 3.1. Criar o arquivo `.env`

1. Na raiz do projeto, **copie** o arquivo `.env.example` e **renomeie a cópia** para `.env`.
2. Abra o `.env` e preencha com os valores da tela que você deixou aberta na Etapa 1.5:

```env
VITE_FIREBASE_API_KEY=AIza........................
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

> O arquivo `.env` **não vai para o GitHub** (está no `.gitignore`) — suas credenciais ficam seguras.

## 3.2. Apontar o projeto Firebase

Abra o arquivo **`.firebaserc`** na raiz e troque `SEU-PROJETO-FIREBASE` pelo **ID do seu projeto** (o mesmo de `VITE_FIREBASE_PROJECT_ID`):

```json
{
  "projects": {
    "default": "seu-projeto-id"
  }
}
```

---

# ETAPA 4 — Colocar o site no ar (Deploy)

## 4.1. Instalar as ferramentas e dependências

No terminal, na pasta do projeto:

```bash
# Instalar as dependências do projeto
npm install

# Instalar a ferramenta do Firebase (só precisa uma vez)
npm install -g firebase-tools
```

## 4.2. Fazer login no Firebase

```bash
firebase login
```

Vai abrir uma janela no navegador — entre com a **mesma conta Google** usada na Etapa 1.

## 4.3. Gerar o build e publicar

```bash
# Gerar a versão de produção do site
npm run build

# Publicar no Firebase Hosting
firebase deploy
```

Ao final, o terminal mostrará o endereço do seu site:

```
✔  Deploy complete!
Hosting URL: https://seu-projeto-id.web.app
```

**Pronto! Seu sistema está no ar!** 🎉

---

# ETAPA 5 — Primeiro acesso (criar seu usuário admin)

1. Acesse o endereço do site (`https://seu-projeto-id.web.app`).
2. Volte ao **Console do Firebase** → **Authentication** → aba **"Users"** → **"Add user"**.
3. Cadastre **seu e-mail e uma senha** → **Add user**.
4. Volte ao site e faça login com esse e-mail e senha.
5. **O primeiro usuário criado vira Administrador automaticamente.** Depois, você pode criar outros usuários (admin ou conferência) em **Configurações → Usuários**.

---

# Atualizações futuras

Sempre que alterar o código e quiser atualizar o site no ar:

```bash
git add .
git commit -m "Descrição da alteração"
git push                  # salva no GitHub
npm run build             # gera nova versão
firebase deploy           # atualiza o site no ar
```

---

# Problemas comuns

| Problema | Solução |
| --- | --- |
| `firebase: command not found` | Rode `npm install -g firebase-tools` novamente |
| Erro de permissão no Firestore | Verifique se publicou as regras do arquivo `firestore.rules` (Etapa 1.4) |
| Tela branca após deploy | Confira se o `.env` está preenchido corretamente e rode `npm run build` + `firebase deploy` de novo |
| `Error: HTTP Error: 403` no deploy | Rode `firebase login --reauth` e tente novamente |
| Login não funciona | Verifique se ativou "E-mail/senha" no Authentication (Etapa 1.2) e se o usuário existe na aba Users |

---

# Resumo visual do fluxo

```
Seu computador                GitHub                 Firebase
─────────────                ──────                 ────────
Código fonte  ──git push──▶  Repositório
     │
     │ npm run build
     ▼
dist/public  ──firebase deploy──▶  Site no ar (web.app)
     │
     └── Firestore (banco) + Authentication (login)
```
