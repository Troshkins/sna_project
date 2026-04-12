const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:3000';

const getAllowedOrigins = () => {
  const configuredOrigins =
    process.env.FRONTEND_ORIGIN || process.env.CORS_ORIGIN || DEFAULT_FRONTEND_ORIGIN;

  return configuredOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

module.exports = {
  getAllowedOrigins,
};
