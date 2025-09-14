import crypto from 'crypto';

export const generateETag = (data) => {
  const stableStringify = (obj) => JSON.stringify(obj, Object.keys(obj).sort());
  return crypto.createHash('sha1').update(stableStringify(data)).digest('hex');
};