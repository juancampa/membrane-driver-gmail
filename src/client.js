let { CLIENT_ID, CLIENT_SECRET } = process.env;
if (!CLIENT_ID || !CLIENT_SECRET) {
  throw new Error('Please provide CLIENT_ID and CLIENT_SECRET as environment variables');
}

let { url: redirectUrl } = program.endpoints.redirect;
if (!redirectUrl) {
  throw new Error('Failed to determine redirect URL');
}

let google = require('googleapis');
let AuthLib = require('google-auth-library');
let googleAuth = new AuthLib();

export let auth = new googleAuth.OAuth2(CLIENT_ID, CLIENT_SECRET, redirectUrl);
export let gmail = google.gmail('v1');

