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

async function getFileSha(path) {
  const { REPO_OWNER, REPO_NAME, GITHUB_TOKEN } = process.env;
  const res = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
      },
    }
  );
  if (!res.ok) return null;
  return (await res.json()).sha;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  if (!verifyToken(event)) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Bad Request' };
  }

  const { content, message, sha: providedSha } = body;
  // path è opzionale: se non passato dal client usa FILE_PATH (per il README)
  const path = body.path || process.env.FILE_PATH;
  const { REPO_OWNER, REPO_NAME, REPO_BRANCH, GITHUB_TOKEN } = process.env;

  if (!path || !content || !message) {
    return { statusCode: 400, body: 'Missing required fields' };
  }

  const sha = providedSha !== undefined ? providedSha : await getFileSha(path);

  const payload = { message, content, branch: REPO_BRANCH };
  if (sha) payload.sha = sha;

  const res = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json',
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await res.json();
  return {
    statusCode: res.status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
};
