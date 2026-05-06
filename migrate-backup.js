// migrate-backup.js - Script para converter backups da versão Google para SQLite
const fs = require('fs');
const path = require('path');

function migrateGoogleBackupToLocal(inputFile, outputFile) {
  console.log(`Lendo backup: ${inputFile}`);
  
  const backup = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  
  // Extrair dados relevantes
  const state = backup.state || {};
  
  // Criar estrutura compatível com a versão atual
  const migratedBackup = {
    version: 2,
    exportedAt: new Date().toISOString(),
    theme: backup.theme || 'dark',
    state: {
      auth: {
        provider: "local",
        username: state.auth?.username || state.auth?.googleEmail || "",
        password: "" // Será definido ao criar conta local
      },
      platforms: state.platforms || [],
      db: state.db || {},
      currentMonth: state.currentMonth || "Janeiro",
      pricing: state.pricing || null,
      currentScreen: state.currentScreen || "hub"
    }
  };
  
  // Remover campos do Google
  delete migratedBackup.state.auth.googleEmail;
  delete migratedBackup.state.auth.googleName;
  delete migratedBackup.state.auth.googlePicture;
  delete migratedBackup.state.auth.googleSub;
  delete migratedBackup.state.auth.googleDriveFileId;
  delete migratedBackup.state.auth.googleDriveModifiedTime;
  delete migratedBackup.state.auth.googleDriveLastAction;
  delete migratedBackup.state.auth.googleDriveAuthorized;
  
  fs.writeFileSync(outputFile, JSON.stringify(migratedBackup, null, 2));
  console.log(`Backup migrado salvo em: ${outputFile}`);
  console.log(`Plataformas: ${migratedBackup.state.platforms.length}`);
  console.log(`Meses: ${Object.keys(migratedBackup.state.db).join(', ')}`);
  
  return migratedBackup;
}

// Uso:
if (require.main === module) {
  const args = process.argv.slice(2);
  const inputFile = args[0] || 'dashboard-vendas-backup-maio.json';
  const outputFile = args[1] || inputFile.replace('.json', '-migrated.json');
  
  try {
    migrateGoogleBackupToLocal(inputFile, outputFile);
  } catch (error) {
    console.error('Erro na migração:', error.message);
    process.exit(1);
  }
}

module.exports = { migrateGoogleBackupToLocal };