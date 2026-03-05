const crypto = require('crypto');

function verifyToken(event) {
  const token = event.headers['x-session'];
  if (!token) return false;
  const expected = crypto
    .createHmac('sha256', process.env.EDITOR_PASSWORD)
    .update('session')
    .digest('hex');
  return token === expected;
}

exports.handler = async (event) => {
  if (!verifyToken(event)) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  const { REPO_OWNER, REPO_NAME, FILE_PATH, GITHUB_TOKEN } = process.env;

  const res = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
      },
    }
  );

  const data = await res.json();
  return {
    statusCode: res.status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
};
