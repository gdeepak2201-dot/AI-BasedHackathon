const Joi = require('joi');

const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message.replace(/['"]/g, '')
      }));
      return res.status(400).json({ error: 'Validation failed', details });
    }

    req[property] = value;
    next();
  };
};

// Common schemas
const schemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
      .messages({ 'string.pattern.base': 'Password must contain uppercase, lowercase, and number' }),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    departmentId: Joi.string().uuid().optional(),
    roleId: Joi.number().integer().min(1).max(3).optional()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  createProject: Joi.object({
    title: Joi.string().min(3).max(255).required(),
    description: Joi.string().max(2000).optional(),
    departmentId: Joi.string().uuid().optional(),
    startDate: Joi.date().optional(),
    deadline: Joi.date().optional(),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
    tags: Joi.array().items(Joi.string()).optional(),
    memberIds: Joi.array().items(Joi.string().uuid()).optional()
  }),

  createTask: Joi.object({
    projectId: Joi.string().uuid().required(),
    milestoneId: Joi.string().uuid().optional().allow(null),
    title: Joi.string().min(3).max(255).required(),
    description: Joi.string().max(2000).optional(),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
    skillTags: Joi.array().items(Joi.string()).optional(),
    deadline: Joi.date().optional(),
    estimatedHours: Joi.number().min(0).max(1000).optional(),
    assigneeIds: Joi.array().items(Joi.string().uuid()).optional(),
    parentTaskId: Joi.string().uuid().optional().allow(null)
  }),

  updateTaskStatus: Joi.object({
    status: Joi.string().valid('pending', 'in_progress', 'review', 'completed').required()
  }),

  createLeave: Joi.object({
    leaveType: Joi.string().valid('annual', 'sick', 'personal', 'emergency', 'unpaid').required(),
    startDate: Joi.date().min('now').required(),
    endDate: Joi.date().min(Joi.ref('startDate')).required(),
    reason: Joi.string().min(10).max(500).required()
  }),

  peerReview: Joi.object({
    revieweeId: Joi.string().uuid().required(),
    projectId: Joi.string().uuid().optional(),
    communicationScore: Joi.number().integer().min(1).max(5).required(),
    leadershipScore: Joi.number().integer().min(1).max(5).required(),
    collaborationScore: Joi.number().integer().min(1).max(5).required(),
    technicalScore: Joi.number().integer().min(1).max(5).required(),
    reliabilityScore: Joi.number().integer().min(1).max(5).required(),
    feedback: Joi.string().min(20).max(1000).optional(),
    isAnonymous: Joi.boolean().default(false)
  }),

  timeLog: Joi.object({
    date: Joi.date().required(),
    loginTime: Joi.date().optional(),
    logoutTime: Joi.date().optional(),
    activeMinutes: Joi.number().integer().min(0).max(1440).optional(),
    idleMinutes: Joi.number().integer().min(0).max(1440).optional(),
    breakMinutes: Joi.number().integer().min(0).max(1440).optional()
  })
};

module.exports = { validate, schemas };
