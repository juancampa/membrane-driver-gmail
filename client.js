const { CLIENT_ID, CLIENT_SECRET } = process.env;
if (!CLIENT_ID || !CLIENT_SECRET) {
  throw new Error('Please provide CLIENT_ID and CLIENT_SECRET as environment variables');
}

const { url: redirectUrl } = program.endpoints.redirect;
if (!redirectUrl) {
  throw new Error('Failed to determine redirect URL');
}

const { OAuth2Client } = require('google-auth-library');
export const auth = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, redirectUrl);

const Api = require('googleapis/build/src/apis/gmail/v1');
const api = new Api({});
api.google = { _options: {} };
export const gmail = api;

