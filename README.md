# Dashboard de Vendas

Aplicacao local para acompanhar vendas, pedidos, devolucoes e desempenho por plataforma, com persistencia em SQLite.

## Estrutura

```text
.
|-- public/              # Interface servida pelo backend
|   |-- assets/          # Imagens e icones publicos
|   |-- scripts/         # JavaScript do navegador
|   `-- styles/          # CSS da interface
|-- src/                 # Backend HTTP, banco e entrada Electron
|-- scripts/             # Utilitarios de manutencao e migracao
|-- build/               # Configuracoes auxiliares de empacotamento
|-- .data/               # Dados locais gerados em desenvolvimento
|-- package.json         # Scripts e configuracao principal do app
`-- render.yaml          # Configuracao de deploy no Render
```

## Comandos

```bash
npm start
npm run desktop
npm run dist
npm run migrate:backup
```

## Observacoes

- `npm start` sobe o servidor web local.
- `npm run desktop` abre a versao Electron.
- `npm run dist` gera o instalador Windows em `dist/`.
- `npm run migrate:backup` converte backups antigos para o formato local atual.
