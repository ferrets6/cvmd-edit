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

  const { REPO_OWNER, REPO_NAME, REPO_BRANCH } = process.env;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profileImageUrl: `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/assets/profile.png`,
    }),
  };
};
