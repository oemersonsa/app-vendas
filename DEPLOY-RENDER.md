# Deploy no Render

## O que mudou

Este projeto agora roda como um unico servico Node:

- o frontend continua sendo servido pelo `server.js`
- os dados de negocio ficam no SQLite em `.data/dashboard-vendas.sqlite`
- autenticacao, plataformas, vendas, devolucoes e dashboard passam pela API
- backups e restauracoes sao feitos por arquivo JSON exportado/importado no app

## Passo a passo

1. Suba este repositorio para o GitHub.
2. No Render, crie um `Web Service` apontando para o repositorio.
3. Use:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Defina as variaveis de ambiente:
   - `NODE_VERSION=24`
   - `APP_ORIGIN=https://SEU-APP.onrender.com`
   - `SQLITE_DATABASE_PATH=.data/dashboard-vendas.sqlite`
5. Faca o deploy.

## Observacoes

- O app usa `node:sqlite`, por isso precisa de Node 22.5 ou superior.
- Em Render Free, o disco do servico pode ser efemero. Para dados duraveis, use um Persistent Disk pago ou migre a camada `database.js` para PostgreSQL.
- O GitHub Pages nao atende este projeto porque ele nao executa `server.js`.
