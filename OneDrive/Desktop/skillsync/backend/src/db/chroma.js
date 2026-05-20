const logger = require('../utils/logger');

let client = null;
let collections = {};

const COLLECTION_NAMES = {
  SKILLS: 'employee_skills',
  CONTRIBUTIONS: 'task_contributions',
  PEER_REVIEWS: 'peer_review_embeddings',
  PROJECTS: 'project_context'
};

// Try to load chromadb, but don't fail if not available
let ChromaClient = null;
try {
  ChromaClient = require('chromadb');
} catch (e) {
  logger.warn('chromadb package not installed - vector search disabled');
}

const connectChroma = async () => {
  if (!ChromaClient) {
    logger.warn('ChromaDB unavailable - install chromadb package for vector search');
    return null;
  }

  try {
    client = new ChromaClient({
      path: `http://${process.env.CHROMA_HOST || 'localhost'}:${process.env.CHROMA_PORT || 8000}`
    });

    await client.heartbeat();

    await initializeCollections();
    logger.info('ChromaDB collections initialized');
    return client;
  } catch (error) {
    logger.warn('ChromaDB connection failed, running in degraded mode:', error.message);
    return null;
  }
};

const initializeCollections = async () => {
  if (!client) return;
  for (const [key, name] of Object.entries(COLLECTION_NAMES)) {
    try {
      collections[key] = await client.getOrCreateCollection({
        name,
        metadata: { description: `SkillSync ${key} embeddings`, hnsw_space: 'cosine' }
      });
    } catch (error) {
      logger.warn(`Failed to init collection ${name}:`, error.message);
    }
  }
};

const getCollection = (collectionKey) => {
  if (!collections[collectionKey]) {
    logger.warn(`Collection ${collectionKey} not available`);
    return null;
  }
  return collections[collectionKey];
};

const lateChunkText = (text, maxChunkSize = 512, overlap = 64) => {
  if (!text || text.length <= maxChunkSize) return [text];
  
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + maxChunkSize, text.length);
    let breakPoint = end;
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint <= start) breakPoint = end;
    }
    chunks.push(text.slice(start, breakPoint + 1).trim());
    start = breakPoint + 1 - overlap;
    if (start < 0) start = 0;
  }
  
  return chunks.filter(c => c.length > 0);
};

const upsertSkillEmbedding = async (employeeId, skillData, embedding = null) => {
  if (!client) return null;
  const collection = getCollection('SKILLS');
  if (!collection) return null;

  try {
    const docId = `skill_${employeeId}_${Date.now()}`;
    const text = `${skillData.skills.join(', ')} ${skillData.context || ''}`;
    const chunks = lateChunkText(text);
    
    const documents = [];
    const ids = [];
    const metadatas = [];

    chunks.forEach((chunk, idx) => {
      ids.push(`${docId}_chunk_${idx}`);
      documents.push(chunk);
      metadatas.push({
        employeeId,
        chunkIndex: idx,
        totalChunks: chunks.length,
        skills: skillData.skills.join(','),
        extractedAt: new Date().toISOString(),
        source: skillData.source || 'system'
      });
    });

    await collection.upsert({ ids, documents, metadatas });
    return docId;
  } catch (error) {
    logger.error('ChromaDB upsert error:', error.message);
    return null;
  }
};

const querySkillSimilarity = async (queryText, nResults = 10, filter = {}) => {
  if (!client) return { documents: [[]], metadatas: [[]], distances: [[]] };
  const collection = getCollection('SKILLS');
  if (!collection) return { documents: [[]], metadatas: [[]], distances: [[]] };

  try {
    const whereClause = Object.keys(filter).length > 0 ? { where: filter } : {};
    return await collection.query({ queryTexts: [queryText], nResults, ...whereClause });
  } catch (error) {
    logger.error('ChromaDB query error:', error.message);
    return { documents: [[]], metadatas: [[]], distances: [[]] };
  }
};

const upsertContributionEmbedding = async (taskId, contributionData) => {
  if (!client) return null;
  const collection = getCollection('CONTRIBUTIONS');
  if (!collection) return null;

  try {
    const text = `${contributionData.title} ${contributionData.description} ${contributionData.tags?.join(' ') || ''}`;
    const chunks = lateChunkText(text, 256, 32);

    const ids = chunks.map((_, idx) => `contrib_${taskId}_${idx}`);
    const metadatas = chunks.map((_, idx) => ({
      taskId,
      employeeId: contributionData.employeeId,
      chunkIndex: idx,
      projectId: contributionData.projectId || '',
      createdAt: new Date().toISOString()
    }));

    await collection.upsert({ ids, documents: chunks, metadatas });
    return `contrib_${taskId}`;
  } catch (error) {
    logger.error('ChromaDB contribution upsert error:', error.message);
    return null;
  }
};

const queryContributions = async (queryText, employeeId = null, nResults = 5) => {
  if (!client) return { documents: [[]], metadatas: [[]] };
  const collection = getCollection('CONTRIBUTIONS');
  if (!collection) return { documents: [[]], metadatas: [[]] };

  try {
    const filter = employeeId ? { where: { employeeId } } : {};
    return await collection.query({ queryTexts: [queryText], nResults, ...filter });
  } catch (error) {
    logger.error('ChromaDB contribution query error:', error.message);
    return { documents: [[]], metadatas: [[]] };
  }
};

const deleteEmployeeEmbeddings = async (employeeId) => {
  if (!client) return;
  const collection = getCollection('SKILLS');
  if (!collection) return;

  try {
    await collection.delete({ where: { employeeId } });
  } catch (error) {
    logger.error('ChromaDB delete error:', error.message);
  }
};

module.exports = {
  connectChroma,
  getCollection,
  lateChunkText,
  upsertSkillEmbedding,
  querySkillSimilarity,
  upsertContributionEmbedding,
  queryContributions,
  deleteEmployeeEmbeddings,
  COLLECTION_NAMES
};
