import { DataSource } from 'typeorm';
import { SeederService } from './seeder.service';
import { connectionSource } from '../config/typeorm';

async function runSeeder() {
  let dataSource: DataSource | null = null;

  try {
    console.log('🔄 Inicializando conexión a la base de datos...');
    dataSource = await connectionSource.initialize();
    console.log('✅ Conexión establecida');

    const seeder = new SeederService(dataSource);
    await seeder.seedAll();

    console.log('🎉 Seeding completado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante el seeding:', error);
    process.exit(1);
  } finally {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('🔌 Conexión cerrada');
    }
  }
}

runSeeder();

