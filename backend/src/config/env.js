const getRequiredEnv = (name) => {
  const value = process.env[name];

  if (typeof value !== 'string' || value.trim() === '') {
    const error = new Error(`Missing required environment variable: ${name}`);
    error.name = 'ConfigError';
    throw error;
  }

  return value;
};

const validateRequiredEnv = (...names) => {
  names.forEach((name) => {
    getRequiredEnv(name);
  });
};

module.exports = {
  getRequiredEnv,
  validateRequiredEnv,
};
