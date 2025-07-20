import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/user.model';

dotenv.config();

async function resetAllUsersPasswords() {
  try {
    // Configuration de connexion
    const MONGODB_URI = `mongodb+srv://${process.env.STOTRA_MONGODB_USERNAME}:${process.env.STOTRA_MONGODB_PASSWORD}@${process.env.STOTRA_MONGODB_CLUSTER}`;
    
    console.log('🔗 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000
    });
    console.log('✅ Connecté à MongoDB');

    // Récupération des utilisateurs
    const users = await User.find({}).select('username');
    if (users.length === 0) {
      console.log('ℹ️ Aucun utilisateur trouvé dans la base');
      return;
    }

    // Confirmation
    console.log('\n⚠️ ATTENTION: Cette opération va:');
    console.log(`- Affecter ${users.length} utilisateurs`);
    console.log('- Remplacer tous les mots de passe par une valeur temporaire');
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise<string>(resolve => {
      readline.question('Confirmez-vous la réinitialisation? (oui/non): ', resolve);
    });
    readline.close();

    if (answer.toLowerCase() !== 'oui') {
      console.log('❌ Opération annulée');
      return;
    }

    // Réinitialisation
    const tempPassword = "tempPassword123"; // À changer après test
    const result = await User.updateMany(
      {},
      { $set: { password: tempPassword } }
    );

    console.log('\n✅ Réinitialisation terminée:');
    console.log(`- ${result.modifiedCount} utilisateurs mis à jour`);
    console.log(`- Mot de passe temporaire: "${tempPassword}"`);
    console.log('\n🔒 Changez ces mots de passe immédiatement!');

  } catch (error) {
    console.error('\n❌ Erreur:', error instanceof Error ? error.message : error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

resetAllUsersPasswords();