const { Pool } = require('pg');

let pool = null;

const initializeDatabase = async () => {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://lyrics_user:lyrics_password@localhost:5432/lyrics_sync',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    
    // Check if tables exist, if not they'll be created by migrations
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tracks'
      );
    `);
    
    if (result.rows[0].exists) {
      console.log('📊 Database tables already exist');
    } else {
      console.log('🔧 Database tables will be created by migrations');
    }
    
    client.release();
    return pool;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

const getPool = () => {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return pool;
};

const query = async (text, params = []) => {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

module.exports = {
  initializeDatabase,
  getPool,
  query
};