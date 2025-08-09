const redis = require('redis');

let client = null;

const initializeRedis = async () => {
  try {
    client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          console.error('Redis server connection refused');
          return new Error('Redis server connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          return new Error('Redis retry time exhausted');
        }
        if (options.attempt > 10) {
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      }
    });

    client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    client.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    await client.connect();
    return client;
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    throw error;
  }
};

const getClient = () => {
  if (!client) {
    throw new Error('Redis not initialized. Call initializeRedis first.');
  }
  return client;
};

// Job queue helpers
const addJob = async (queueName, jobData, options = {}) => {
  const client = getClient();
  const jobId = `${queueName}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  
  const job = {
    id: jobId,
    data: jobData,
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...options
  };

  await client.lPush(`queue:${queueName}`, JSON.stringify(job));
  await client.hSet(`job:${jobId}`, job);
  
  return jobId;
};

const getJob = async (jobId) => {
  const client = getClient();
  const job = await client.hGetAll(`job:${jobId}`);
  
  if (Object.keys(job).length === 0) {
    return null;
  }

  // Parse JSON fields
  if (job.data) {
    job.data = JSON.parse(job.data);
  }

  return job;
};

const updateJob = async (jobId, updates) => {
  const client = getClient();
  
  // Convert objects to JSON strings for Redis
  const redisUpdates = { ...updates };
  if (redisUpdates.data) {
    redisUpdates.data = JSON.stringify(redisUpdates.data);
  }
  
  redisUpdates.updatedAt = new Date().toISOString();
  
  await client.hSet(`job:${jobId}`, redisUpdates);
};

const getNextJob = async (queueName) => {
  const client = getClient();
  const jobString = await client.rPop(`queue:${queueName}`);
  
  if (!jobString) {
    return null;
  }

  return JSON.parse(jobString);
};

module.exports = {
  initializeRedis,
  getClient,
  addJob,
  getJob,
  updateJob,
  getNextJob
};