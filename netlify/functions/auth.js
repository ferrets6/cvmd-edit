const crypto = require('crypto');

function deriveSessionToken() {
  return crypto
    .createHmac('sha256', process.env.EDITOR_PASSWORD)
    .update('session')
    .digest('hex');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let password;
  try {
    ({ password } = JSON.parse(event.body || '{}'));
  } catch {
    return { statusCode: 400, body: 'Bad Request' };
  }

  if (!password || password !== process.env.EDITOR_PASSWORD) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Password errata' }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: deriveSessionToken() }),
  };
};
