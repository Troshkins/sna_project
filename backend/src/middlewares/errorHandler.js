const { HttpError } = require('../utils/httpError');

const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode =
    error instanceof HttpError
      ? error.statusCode
      : Number.isInteger(error.statusCode) && error.statusCode >= 400
        ? error.statusCode
        : 500;

  if (statusCode >= 500) {
    console.error(error);
  }

  const response = {
    message: error.message || 'Internal server error',
  };

  if (error.details !== undefined) {
    response.details = error.details;
  }

  return res.status(statusCode).json(response);
};

module.exports = errorHandler;
