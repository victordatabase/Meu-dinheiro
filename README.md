# Meu Dinheiro — Controle Financeiro Pessoal

App de controle financeiro pessoal: lançamentos em estilo chat, organizados por
grupo/fonte (ex: Cartão Nubank, Dinheiro), com suporte a compras parceladas e
gastos recorrentes, dashboard com gráficos, exportação em planilha (Excel) e
impressão/geração de PDF. Tema escuro com destaque em gradiente roxo. Possui
login simples para separar os dados entre diferentes pessoas que usam o app.

Funciona como **PWA (Progressive Web App)**: pode ser instalado tanto no
celular quanto no computador, ganha ícone próprio, abre em tela cheia (sem
barra do navegador) e continua funcionando offline depois de instalado.

## Rodando localmente

Pré-requisitos: [Node.js](https://nodejs.org) instalado (versão 18 ou superior).

```bash
npm install
npm run dev
```

Isso abre o app em `http://localhost:5173`. (A instalação como app/PWA só
fica disponível em modo de produção — veja "testar como app" abaixo.)

## Publicando no GitHub Pages (automático)

1. Crie um repositório novo no GitHub e suba este projeto:

   ```bash
   git init
   git add .
   git commit -m "primeira versão do app"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
   git push -u origin main
   ```

2. No GitHub, vá em **Settings → Pages** do repositório e, em **Build and
   deployment → Source**, selecione **GitHub Actions**.
3. Pronto — o workflow em `.github/workflows/deploy.yml` já está configurado
   para buildar e publicar o site automaticamente a cada `push` na branch
   `main`. Depois do primeiro deploy, o link do site aparece nessa mesma
   página de configurações (algo como
   `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/`).

## Instalando como aplicativo

Depois que o site estiver publicado (ou rodando localmente em modo produção,
veja abaixo), dá para instalar como um app de verdade:

- **Android (Chrome)**: abra o link → menu (⋮) → "Instalar aplicativo" ou
  "Adicionar à tela inicial".
- **iPhone/iPad (Safari)**: abra o link → botão de compartilhar → "Adicionar
  à Tela de Início".
- **Windows/Mac/Linux (Chrome ou Edge)**: abra o link → clique no ícone de
  instalação que aparece na barra de endereço (ou menu → "Instalar Meu
  Dinheiro…").

O app abre em janela própria, com ícone na tela inicial/área de trabalho, e
continua funcionando mesmo sem internet depois da primeira visita.

### Testar como app localmente (antes de publicar)

```bash
npm run build
npm run preview
```

Abra o link mostrado (`http://localhost:4173`) — nesse modo o botão de
instalação aparece normalmente, como se já estivesse publicado.

## Publicando manualmente (alternativa ao GitHub Actions)

Se preferir gerar os arquivos finais você mesmo:

```bash
npm run build
```

Isso cria a pasta `dist/` com o site pronto — é só hospedar essa pasta em
qualquer servidor estático (GitHub Pages, Netlify, Vercel, etc.).

## Sobre o armazenamento dos dados

O app salva os dados (grupos, lançamentos e contas de login) no
`localStorage` do navegador/dispositivo de cada pessoa que instala — não
existe um banco de dados na nuvem por trás. Isso significa:

- Os dados ficam salvos entre uma visita e outra, no mesmo dispositivo.
- Se a pessoa desinstalar o app ou limpar os dados do navegador, os
  lançamentos são perdidos.
- Se instalar em outro celular/computador, os dados não aparecem lá (não há
  sincronização entre aparelhos).
- O login criado dentro do app organiza o acesso entre pessoas de confiança
  que usam o **mesmo dispositivo** (ex: computador da família) — não é uma
  camada de segurança criptográfica de verdade, já que todo o código roda no
  navegador, sem servidor.

## Estrutura do projeto

```
├── index.html               # HTML base (Tailwind via CDN + metatags do PWA)
├── public/
│   ├── favicon.png
│   ├── apple-touch-icon.png
│   └── icons/                # ícones do app (192, 512, maskable)
├── src/
│   ├── main.jsx               # ponto de entrada React + registro do service worker
│   ├── App.jsx                 # todo o app (telas, lógica, componentes)
│   └── storageShim.js          # implementação de armazenamento via localStorage
├── vite.config.js              # inclui o plugin de PWA (manifest + service worker)
├── package.json
└── .github/workflows/deploy.yml   # publica automaticamente no GitHub Pages
```
