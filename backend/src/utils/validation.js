const mongoose = require('mongoose');
const { httpError } = require('./httpError');

const normalizeString = (value) =>
  typeof value === 'string' ? value.trim() : '';

const normalizeLowercaseString = (value) =>
  normalizeString(value).toLowerCase();

const ensureObjectId = (value, fieldName) => {
  const normalizedValue = normalizeString(value);

  if (!mongoose.Types.ObjectId.isValid(normalizedValue)) {
    throw httpError(400, `Invalid ${fieldName}`);
  }

  return normalizedValue;
};

module.exports = {
  normalizeString,
  normalizeLowercaseString,
  ensureObjectId,
};
