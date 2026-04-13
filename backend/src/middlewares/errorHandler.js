const { HttpError } = require('../utils/httpError');

const getDuplicateKeyMessage = (error) => {
  const duplicateFields = Object.keys(error.keyPattern || error.keyValue || {});

  if (
    duplicateFields.includes('email') ||
    duplicateFields.includes('username')
  ) {
    return 'User with this email or username already exists';
  }

  if (duplicateFields.includes('normalizedName')) {
    return 'Room with this name already exists';
  }

  return 'Resource already exists';
};

const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error?.code === 11000) {
    return res.status(409).json({
      message: getDuplicateKeyMessage(error),
    });
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
