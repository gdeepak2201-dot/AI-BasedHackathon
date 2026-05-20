const logger = require('../utils/logger');

let driver = null;
let session = null;

// Try to load neo4j-driver, but don't fail if not available
let neo4j = null;
try {
  neo4j = require('neo4j-driver');
} catch (e) {
  logger.warn('neo4j-driver package not installed - graph features disabled');
}

const connectNeo4j = async () => {
  if (!neo4j) {
    logger.warn('Neo4j unavailable - install neo4j-driver package for graph features');
    return null;
  }

  try {
    driver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'password'
      ),
      {
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 2000,
        logging: {
          level: 'warn',
          logger: (level, message) => logger.warn(`Neo4j [${level}]: ${message}`)
        }
      }
    );

    await driver.verifyConnectivity();
    logger.info('Neo4j connectivity verified');
    await initializeNeo4jSchema();
    return driver;
  } catch (error) {
    logger.warn('Neo4j connection failed, running in degraded mode:', error.message);
    driver = null;
    return null;
  }
};

const initializeNeo4jSchema = async () => {
  if (!driver) return;
  const s = driver.session();
  try {
    await s.run('CREATE CONSTRAINT employee_id IF NOT EXISTS FOR (e:Employee) REQUIRE e.id IS UNIQUE');
    await s.run('CREATE CONSTRAINT project_id IF NOT EXISTS FOR (p:Project) REQUIRE p.id IS UNIQUE');
    await s.run('CREATE INDEX collab_weight IF NOT EXISTS FOR ()-[r:COLLABORATED_WITH]-() ON (r.weight)');
  } catch (error) {
    logger.warn('Neo4j schema init warning:', error.message);
  } finally {
    await s.close();
  }
};

const getDriver = () => driver;

const runQuery = async (cypher, params = {}) => {
  if (!driver) {
    logger.warn('Neo4j not available, skipping graph query');
    return { records: [] };
  }
  const s = driver.session();
  try {
    const result = await s.run(cypher, params);
    return result;
  } catch (error) {
    logger.error('Neo4j query error:', error.message);
    throw error;
  } finally {
    await s.close();
  }
};

const upsertEmployee = async (employeeData) => {
  if (!driver) return { records: [] };
  const cypher = `
    MERGE (e:Employee {id: $id})
    SET e.name = $name, e.department = $department, e.role = $role,
        e.skills = $skills, e.updatedAt = datetime()
    RETURN e
  `;
  return runQuery(cypher, employeeData);
};

const recordCollaboration = async (emp1Id, emp2Id, projectId, weight = 1) => {
  if (!driver) return { records: [] };
  const cypher = `
    MATCH (e1:Employee {id: $emp1Id}) MATCH (e2:Employee {id: $emp2Id})
    MERGE (e1)-[r:COLLABORATED_WITH {projectId: $projectId}]-(e2)
    ON CREATE SET r.weight = $weight, r.count = 1, r.createdAt = datetime()
    ON MATCH SET r.weight = r.weight + $weight, r.count = r.count + 1, r.updatedAt = datetime()
    RETURN r
  `;
  return runQuery(cypher, { emp1Id, emp2Id, projectId, weight });
};

const getTeamChemistry = async (employeeIds) => {
  if (!driver) return { records: [] };
  const cypher = `
    MATCH (e1:Employee)-[r:COLLABORATED_WITH]-(e2:Employee)
    WHERE e1.id IN $employeeIds AND e2.id IN $employeeIds
    RETURN e1.id as emp1, e2.id as emp2, 
           avg(r.weight) as avgWeight, sum(r.count) as totalCollabs,
           count(r) as projectsTogether
  `;
  return runQuery(cypher, { employeeIds });
};

const getCollaborationNetwork = async (employeeId, depth = 2) => {
  if (!driver) return { records: [] };
  const cypher = `
    MATCH path = (e:Employee {id: $employeeId})-[r:COLLABORATED_WITH*1..${depth}]-(colleague:Employee)
    RETURN colleague.id as id, colleague.name as name, colleague.department as department,
           length(path) as distance,
           reduce(w = 0, rel IN relationships(path) | w + rel.weight) as totalWeight
    ORDER BY totalWeight DESC LIMIT 20
  `;
  return runQuery(cypher, { employeeId });
};

const getBestTeamRecommendations = async (requiredSkills, teamSize) => {
  if (!driver) return { records: [] };
  const cypher = `
    MATCH (e:Employee)
    WHERE any(skill IN $requiredSkills WHERE skill IN e.skills)
    WITH e, size([skill IN $requiredSkills WHERE skill IN e.skills]) as skillMatch
    ORDER BY skillMatch DESC LIMIT $teamSize
    OPTIONAL MATCH (e)-[r:COLLABORATED_WITH]-(colleague:Employee)
    RETURN e.id as id, e.name as name, e.skills as skills,
           skillMatch, avg(r.weight) as avgChemistry
    ORDER BY skillMatch DESC, avgChemistry DESC
  `;
  return runQuery(cypher, { requiredSkills, teamSize: neo4j.int(teamSize) });
};

module.exports = {
  connectNeo4j,
  getDriver,
  runQuery,
  upsertEmployee,
  recordCollaboration,
  getTeamChemistry,
  getCollaborationNetwork,
  getBestTeamRecommendations
};
