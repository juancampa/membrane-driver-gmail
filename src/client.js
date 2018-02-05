const { CLIENT_ID, CLIENT_SECRET } = process.env;
if (!CLIENT_ID || !CLIENT_SECRET) {
  throw new Error('Please provide CLIENT_ID and CLIENT_SECRET as environment variables');
}

const { url: redirectUrl } = program.endpoints.redirect;
if (!redirectUrl) {
  throw new Error('Failed to determine redirect URL');
}

const AuthLib = require('google-auth-library');
const googleAuth = new AuthLib();
export const auth = new googleAuth.OAuth2(CLIENT_ID, CLIENT_SECRET, redirectUrl);

const Api = require('googleapis/build/src/apis/gmail/v1');
const api = new Api({});
api.google = { _options: {} };
export const gmail = api;

