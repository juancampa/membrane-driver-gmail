import { gmail, auth } from './client.js';
// import * as pubsub from './pubsub'
import { randomBytes } from 'crypto';
import { promisify } from 'util';
import { parse as parseQuery } from 'querystring';
import { parse as parseUrl } from 'url';
// import gmailEncoder from './gmailEncoder';

const { root } = program.refs;

import Batchelor from 'batchelor';
import DataLoader from 'dataloader';

// Simplify these resolvers once the sdk add support for promises
const getToken = promisify(auth.getToken.bind(auth));
const getProfile = promisify(gmail.users.getProfile.bind(gmail.users));
const watch = promisify(gmail.users.watch.bind(gmail.users));
const stop = promisify(gmail.users.stop.bind(gmail.users));
const listHistory = promisify(gmail.users.history.list.bind(gmail.users.history));

const messages = gmail.users.messages;
const getMessage = promisify(messages.get.bind(messages));
const listMessage = promisify(messages.list.bind(messages));

const threads = gmail.users.threads;
const getThread = promisify(threads.get.bind(threads));
const listThread = promisify(threads.list.bind(threads));

const labels = gmail.users.labels;
const getLabel = promisify(labels.get.bind(labels));
const listLabel = promisify(labels.list.bind(labels));

const TOPIC = 'gmail-driver-webhooks';


// Batching. TODO: it works but the node must send batched resolves which is
// currently not doing
// TODO: replace Batchelor with something that doesn't bring a millon
// dependencies

function createLoader(baseUrl) {
  return new DataLoader(async (keys) => {
    let batch;
    try {
      // Get a fresh access token using the auth library
      auth.credentials = program.state.token;
      const { token } = await auth.getAccessToken();

      batch = new Batchelor({
        uri: 'https://www.googleapis.com/batch/gmail/v1',
        // uri: 'http://localhost:8881/batch',
        auth: { bearer: token },
        headers: { 'Content-Type': 'multipart/mixed' }
      });
      console.log(`Batching ${keys.length} API calls to ${baseUrl}`);
      for (let key of keys) {
        batch.add({
          method: 'GET',
          path: `${baseUrl}/${key}`,
          headers: { authorization: 'Bearer ' + token},
        })
      }
    } catch (e) {
      reject(e);
    }
    return new Promise((resolve, reject) => {
      batch.run((err, response) => {
        if (err) {
          return reject(err);
        }
        resolve(response.parts.map((part) => {
          if (String(part.statusCode) !== '200') {
            return new Error(part.statusMessage || `Response returned status ${part.statusCode}`)
          }
          return part.body
        }));
      });
    });
  });
}

const messageLoader = createLoader('/gmail/v1/users/me/messages');
const threadLoader = createLoader('/gmail/v1/users/me/threads');

export async function init() {
  await root.set({
    threads: {},
    messages: {},
    labels: {},
  });

  console.log('Please go to:', program.endpoints.auth.url);
  console.log('Redirect URL:', program.endpoints.redirect.url);
}

throw new Error('Fail update 2');
export async function update({ previousVersion }) {
  console.log('updating Gmail Driver from previous version: ', previousVersion);
}

export async function test({ name }) {
  switch (name) {
    case 'auth': {
      if (program.state.token) {
        return true;
      }
      break;
    }
    case 'access': {
      if (!program.state.token) {
        return false;
      }
      auth.credentials = program.state.token;

      try {
        const response = await listThread({
          userId: 'me',
          auth,
          maxResults: 1,
        });
        return response && response.status === 200;
      } catch (e) {
        return false;
      }

      break;
    }
    case 'webhooks': {
      // TODO
      return false;
    }
  }
  return false;
}

// This doesn't work for some cases. Only threads for now
function decodeUrlId(id) {
  const decoded = gmailDecoder.decode(id);
  const dash = decoded.indexOf('-');
  if (dash >= 0) {
    return BigInt(decoded.substr(dash + 1)).toString(16);
  }
  return id;
}

export function parse({ name, value }) {
  switch (name) {
    case 'url': {
      const { hash } = parseUrl(value, true);
      const { pathname: path } = parseUrl(hash.substr(1), true);
      const parts = path.split('/');

      let isLabel = false;
      if (parts[0] === 'label') {
        isLabel = true;
        parts.shift();
      }

      if (parts.length === 1) {
        if (isLabel) {
          return root.threads.page({ q: `label:${decodeURIComponent(parts[0])}` })
        } else {
          return root.threads.one({ id: decodeUrlId(parts[0]) })
        }
      } else if (parts.length === 2) {
        return root.threads.one({ id: decodeUrlId(parts[1]) })
      }
    }
  }
}

// export async function onWebhook({ sender, args }) {
//   const data = new Buffer(args.data, 'base64').toString();
//   const { emailAddress, historyId: newHistoryId } = JSON.parse(data);
//
//   const { state } = program;
//   const { token, historyId } = state;
//
//   // TODO: IMPORTANT shouldn't we need to create a new auth object everytime?
//   auth.credentials = token;
//
//   // Get everything that happened to the user's mailbox after we last checked
//   const response = await listHistory({
//     userId: emailAddress,
//     auth,
//     startHistoryId: historyId || newHistoryId
//   });
//
//   if (!response.history) {
//     return;
//   }
//
//   const { observedLabels } = program.state;
//
//   // Dispatch events
//   for (let item of response.history) {
//     const { labelsAdded, messagesAdded } = item;
//
//     // if (messagesAdded) {
//     //   for (let messageAdded of messagesAdded) {
//     //     const { labelIds, id } = messageAdded.message;
//     //     for (let labelId of labelIds) {
//     //       if (observedLabels.indexOf(labelId) >= 0) {
//     //         root.labels.one({ id: labelId })
//     //           .messageAdded
//     //           .dispatch({
//     //             message: root.messages.one({ id })
//     //           });
//     //       }
//     //     }
//     //   }
//     // }
//
//     if (labelsAdded) {
//       for (let labelAdded of labelsAdded) {
//         const { labelIds, message } = labelAdded;
//         for (let labelId of labelIds) {
//           if (observedLabels.indexOf(labelId) >= 0) {
//             root.labels.one({ id: labelId })
//               .messageAdded
//               .dispatch({
//                 message: root.messages.one({ id: message.id })
//               });
//           }
//         }
//       }
//     }
//
//     // if (labelsAdded) {
//     //   for (let labelAdded of labelsAdded) {
//     //     const labelIds = labelAdded.labelIds;
//     //     if (labelIds && labelIds.indexOf('STARRED') >= 0) {
//     //       const { id } = labelAdded.message;
//     //       root.messages.messageStarred.dispatch({ message: root.messages.one({ id }) });
//     //     }
//     //   }
//     // }
//   }
//
//   // Save this history id for next time
//   program.state.historyId = newHistoryId;
//   await program.save();
// }

export async function endpoint({ name, req }) {
  switch (name) {
    case 'auth': {
      // The oauth state field is used to retrieve this same account when the user
      // accepts the consent screen and it gets redirected to our redirect endpoint
      const authState = randomBytes(32).toString('hex');
      program.state.authState = authState;
      await program.save();

      // generate the url the user can use to authorize our client
      const authUrl = auth.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        state: authState,
        scope: ['https://www.googleapis.com/auth/gmail.readonly']
      });

      return {
        body: `
          <html>
            <body>
              <center>
                <a href="${authUrl}">Authorize with Google</a>
              </center>
            </body>
          </html>
        `
      }
    }
    case 'redirect': {
      const { code, state: authState } = parseQuery(parseUrl(req.url).query);
      if (!code || authState != program.state.authState) {
        throw new Error('Error while getting code from callback');
      }

      const token = await getToken(code);
      auth.credentials = token;
      // const profile = await getProfile({ userId: 'me', auth });
      //
      // try {
      //   await pubsub.createTopic({ name: TOPIC });
      //   // TODO: use the IAM API to allow gmail to post to this topic
      //
      // } catch (err) {
      //   // google-cloud errors have a status field that is more reliable than
      //   // checking the message but it doesn't go through our message queue
      //   if (!err.toString().indexOf('already exists')) {
      //     throw err;
      //   }
      // }
      //
      // const options = { pushEndpoint: program.endpoints.webhooks.url };
      // const name = pubsub.getSubscriptionName(TOPIC);
      // await client.subscribe(TOPIC, name, options);
      //
      // // Listen for changes in this user's inbox. This driver could start
      // // watching when a subscription is made but it requires keeping track of a
      // // lot of things so I'm skipping that for now.
      // const response = await watch({
      //   userId: profile.emailAddress,
      //   auth,
      //   resource: {
      //     topicName: 'projects/modular-silicon-111805/topics/gmail-driver-webhooks',
      //   },
      // });
      // Object.assign(program.state, { token, historyId: response.historyId });

      Object.assign(program.state, { token });
      await program.save();
    }
  }
}

export let Root = {
}

export let MessageCollection = {
  async one({ args }) {
    return messageLoader.load(args.id);
  },

  async page({ args }) {
    const options = {
      userId: 'me',
      auth,
      id: args.id,
    };

    const params = [ 'labelIds', 'pageToken', 'q', 'includeSpamTrash' ];
    for (let param of params) {
      if (args[param] !== undefined) {
        options[param] = args[param];
      }
    }

    // TODO: pageSize and maxResults are not the same
    if (args.pageSize !== undefined) {
      options.maxResults = args.pageSize;
    }

    auth.credentials = program.state.token;
    const { data } = await listMessage(options);
    return data;
  },
  async send({ args }) {
    auth.credentials = program.state.token;
    const { data } = await getProfile({ userId: "me", auth });
    const { from, to, body, subject } = args;
    const From = from ? from : data.emailAddress;

    const base64EncodedEmail = new Buffer(
      `Content-Type:  text/plain;
      charset="UTF-8"\n
      Content-length: 5000\n
      Content-Transfer-Encoding: message/rfc2822\n
      to: ${to}\n
      from: ${from}\n
      subject: ${subject}\n\n
      ${body}`
    ).toString('base64')
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    const res = await sendMessage({
      userId: "me",
      auth,
      resource: {
        raw: base64EncodedEmail
      }
    });
    return res.data;
  }
};

export let MessagePage = {
  next({ self, source }) {
    if (source.nextPageToken === undefined) {
      return null;
    }
    const args = self.match(root.messages.page());
    return root.messages.page({ ...args, pageToken: source.nextPageToken })
  },

  items({ source, info }) {
    return Promise.all(source.messages.map(async (item) => {
      const query = info.createMissingFieldsSubquery(item);
      if (!query) {
        return item;
      }

      // TODO: use an actual query so that we only fetch the missing fields
      // TODO: for that to work though we need to implement local queries so
      // that it doesn't even leave the worker, and/or, batching going up to the
      // node and the node batching across multiple queries
      const rest = await MessageCollection.one({ args: { id: item.id }});
      return { ...item, ...rest };
    }));
  }
};

export let Message = {
  self({ source }) {
    const { id } = source;
    if (id === undefined || id === null) {
      return null;
    }
    return root.messages.one({ id })
  },

  text({ self, source }) {
    let result = '';
    if (!source.payload) {
      return null;
    }
    const stack = [source.payload];
    while (stack.length > 0) {
      const part = stack.pop();
      if (part.mimeType.startsWith('multipart/')) {
        stack.push(...part.parts);
      } else if (part.mimeType.startsWith('text/plain')) {
        result += Buffer.from(part.body.data, 'base64').toString('utf8') + '\n';
      }
    }
    return result;
  },

  thread({ source }) {
    const { threadId: id } = source;
    if (id === undefined || id === null) {
      return null;
    }
    return root.threads.one({ id })
  },
  from({ source }) {
    return (source.payload.headers.find((h) => h.name === 'From') || {}).value;
  },
  to({ source }) {
    return (source.payload.headers.find((h) => h.name === 'To') || {}).value;
  },
  subject({ source }) {
    return (source.payload.headers.find((h) => h.name === 'Subject') || {}).value;
  }
};

export let HeaderCollection = {
  one({ source, args }) {
    // Header name is case-insensitive
    const name = args.name.toUpperCase();
    return source.find((header) => header && header.name && header.name.toUpperCase() === name);
  },

  // TODO: see description of the problem in info.js file.
  items({ source }) {
    return source;
  },
}

export let Header = {
  // TODO: see description of the problem in info.js file.
  self({ source, self, parent }) {
    return self || parent.pop().push('one', { name: source.name });
  },
};

export let ThreadCollection = {
  async one({ args }) {
    const thread = threadLoader.load(args.id);

    // Add some consistency by copying the snippet of the first message as the
    // snippet of the thread which is what threads.list seems to return.
    thread.snippet = thread.messages[0].snippet;

    return thread;
  },

  async page({ args }) {
    const options = {
      userId: 'me',
      auth,
      id: args.id,
    };

    const params = [ 'labelIds', 'pageToken', 'q', 'includeSpamTrash' ];
    for (let param of params) {
      if (args[param] !== undefined) {
        options[param] = args[param];
      }
    }
    if (args.pageSize !== undefined) {
      options.maxResults = args.pageSize;
    }

    auth.credentials = program.state.token;
    const { data } = await listThread(options);
    console.error(options);
    console.error(data);
    return data;
  }
};

export let ThreadPage = {
  next({ self, source }) {
    if (source.nextPageToken === undefined) {
      return null;
    }
    const args = self.match(root.threads.page());
    return root.threads.page({ ...args, pageToken: source.nextPageToken })
  },

  items({ source }) {
    return source.threads;
  }
};

export let ThreadPageItem = {
  self({ source }) {
    const { id } = source;
    if (id === undefined || id === null) {
      return null;
    }
    return root.threads.one({ id })
  },
};

export let Thread = {
  self({ source }) {
    const { id } = source;
    if (id === undefined || id === null) {
      return null;
    }
    return root.threads.one({ id })
  },
};

export let LabelCollection = {
  one({ args }) {
    auth.credentials = program.state.token;
    const { data: label } = getLabel({ userId: 'me', auth, id: args.id });
    return label;
  },

  async withName({ args }) {
    auth.credentials = program.state.token;
    const labels = await root.labels.items().query('{ id name }');
    const label = labels.find((l) => l.name === args.name);
    if (!label || !label.id) {
      return null;
    }
    return root.labels.one({ id: label.id });
    // return getLabel({ userId: 'me', auth, id: label.id });
  },

  async items() {
    const options = {
      userId: 'me',
      auth,
    };

    auth.credentials = program.state.token;
    const { data } = await listLabel(options);
    return data.labels;
  }
};

export let Label = {
  messageAdded: {
    subscribe: async ({ self }) => {
      let { id } = self.match(root.labels.one());
      if (id === undefined) {
        id = await self.id.get();
      }
      const { state } = program;
      const observedLabels = state.observedLabels = state.observedLabels || [];
      observedLabels.push(id);
      await program.save();

      console.log('SUBSCRIBED TO LABEL', id);
    },
    unsubscribe: async ({ self }) => {
      let { id } = self.match(root.labels.one());
      if (id === undefined) {
        id = await self.id.get();
      }
      const { state } = program;
      const index = state.observedLabels.indexOf(id);
      if (index >= 0) {
        state.observedLabels.splice(index, 1);
      }
      await program.save();
      console.log('UNSUBSCRIBED TO LABEL', id);
    }
  }
};
