/**
 * CachePilot: Intelligent caching layer with adaptive TTL.
 * Tracks hit rates and adjusts TTL based on access patterns.
 * Reduces AI agent token usage by caching expensive computations.
 */
const NodeCache = require('node-cache');
const logger = require('./logger');

class CachePilot {
  constructor(options = {}) {
    this.cache = new NodeCache({
      stdTTL: options.defaultTTL || 300,
      checkperiod: 60,
      useClones: false
    });

    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
    this.accessPatterns = new Map();
    this.adaptiveTTLEnabled = options.adaptiveTTL !== false;

    // Log stats every 5 minutes
    setInterval(() => this._logStats(), 5 * 60 * 1000);
  }

  get(key) {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.stats.hits++;
      this._recordAccess(key);
      return value;
    }
    this.stats.misses++;
    return null;
  }

  set(key, value, ttl = null) {
    const effectiveTTL = ttl || this._getAdaptiveTTL(key);
    this.cache.set(key, value, effectiveTTL);
    this.stats.sets++;
    return true;
  }

  del(key) {
    if (typeof key === 'string' && key.includes('*')) {
      const prefix = key.replace('*', '');
      const keys = this.cache.keys().filter(k => k.startsWith(prefix));
      keys.forEach(k => this.cache.del(k));
      this.stats.deletes += keys.length;
      return keys.length;
    }
    this.cache.del(key);
    this.stats.deletes++;
    return 1;
  }

  /**
   * Get or compute — primary interface for AI result caching.
   * Returns { data, fromCache } so callers know the source.
   */
  async getOrCompute(key, factory, ttl = null) {
    const cached = this.get(key);
    if (cached !== null) {
      return { data: cached, fromCache: true };
    }
    const data = await factory();
    this.set(key, data, ttl);
    return { data, fromCache: false };
  }

  invalidateEntity(entityType, entityId) {
    return this.del(`${entityType}:${entityId}*`);
  }

  static buildKey(...parts) {
    return parts.filter(p => p !== null && p !== undefined).join(':');
  }

  _recordAccess(key) {
    const now = Date.now();
    const pattern = this.accessPatterns.get(key) || { count: 0, lastAccess: now, intervals: [] };
    if (pattern.lastAccess) {
      pattern.intervals.push(now - pattern.lastAccess);
      if (pattern.intervals.length > 10) pattern.intervals.shift();
    }
    pattern.count++;
    pattern.lastAccess = now;
    this.accessPatterns.set(key, pattern);
  }

  _getAdaptiveTTL(key) {
    if (!this.adaptiveTTLEnabled) return 300;
    const pattern = this.accessPatterns.get(key);
    if (!pattern || pattern.intervals.length < 3) return 300;
    const avgInterval = pattern.intervals.reduce((a, b) => a + b, 0) / pattern.intervals.length / 1000;
    return Math.min(Math.max(avgInterval * 2, 60), 3600);
  }

  _logStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(1) : '0.0';
    logger.info(`CachePilot stats: hits=${this.stats.hits} misses=${this.stats.misses} hitRate=${hitRate}% keys=${this.cache.keys().length}`);
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return { ...this.stats, hitRate: total > 0 ? this.stats.hits / total : 0, keys: this.cache.keys().length };
  }
}

// Singleton instances
const aiCache = new CachePilot({ defaultTTL: 600, adaptiveTTL: true });      // AI results: 10 min
const dataCache = new CachePilot({ defaultTTL: 120, adaptiveTTL: true });     // DB results: 2 min
const sessionCache = new CachePilot({ defaultTTL: 900, adaptiveTTL: false }); // Sessions: 15 min

module.exports = { CachePilot, aiCache, dataCache, sessionCache };
