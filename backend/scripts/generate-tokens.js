// Dev utility: generate JWT tokens for all roles for manual RBAC testing
// Usage:
//   npm run tokens
// or
//   node scripts/generate-tokens.js

const jwt = require('jsonwebtoken');

const secret = process.env.JWT_ACCESS_SECRET || 'dev-access-secret';
const expiresIn = process.env.JWT_ACCESS_TTL || '1h';

const roles = [
  'admin',
  'manager',
  'warehouse_staff',
  'procurement',
  'logistics',
  'partner',
];

function padRight(text, len) {
  if (text.length >= len) return text;
  return text + ' '.repeat(len - text.length);
}

console.log('JWT secret used:', secret);
console.log('TTL:', expiresIn);
console.log('\nTokens for manual RBAC testing (copy the whole Bearer line):\n');

const out = {};
for (const role of roles) {
  const payload = {
    sub: `user-${role}-uuid`,
    email: `${role}@example.com`,
    role,
  };
  const token = jwt.sign(payload, secret, { expiresIn });
  out[role] = token;
  console.log(padRight(role.toUpperCase() + ':', 18), `Bearer ${token}`);
}

console.log('\nPowerShell quick set (copy/paste):');
for (const role of roles) {
  const varName = role.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  console.log(`$${varName} = "${out[role]}"`);
}

console.log('\nNote: These tokens are signed with current JWT_ACCESS_SECRET.');


