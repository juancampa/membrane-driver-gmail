const { dependencies, endpoints, environment, imports, schema, expressions, tests } = program;

// Environment
environment
  .add('CLIENT_ID', 'The API clientID')
  .add('CLIENT_SECRET', 'The API client secret')
  .add('projectId', 'The Project ID')
  .add('clientEmail', 'The email address as provided by Google Cloud Console')
  .add('privateKey', 'The private key')

tests
  .add('auth', 'The driver has authenticated correctly with the Gmail API')
  .add('access', 'The driver can acces the Gmail API and retrieve data')
  .add('webhooks', 'The driver can receive webhooks from gmail')

// Imports
// imports
//   .add('googlepubsub')

// Dependencies
// dependencies
//   .add('pubsub', 'googlepubsub:Root', 'The Google Pub Sub root type. Used to listen for changes')

// Endpoints
endpoints
  .https('auth', 'Visit this endpoint to authorize access to your account', { response: true })
  .https('redirect', 'Set this URL in Google API Console for oauth redirect')

// Parseable expressions
expressions
  .add('url', '^https://mail.google.com/.+$')

// Types
schema.type('Root')
  .field('threads', 'ThreadCollection')
  .field('messages', 'MessageCollection')
  .field('labels', 'LabelCollection')

schema.type('ThreadCollection')
  .computed('one', 'Thread', 'A thread. A set of messages grouped by subject')
    .param('id', 'String', 'The id of the message')
  .computed('page', 'ThreadPage', 'All the threads')
    .param('pageSize', 'Int', 'Maximum number of threads to return. Originally "maxResults"')
    .param('includeSpamTrash', 'Boolean', 'Include threads from SPAM and TRASH in the results')
    .param('labelIds', 'String', 'Only return threads with labels that match all of the specified label IDs')
    .param('pageToken', 'String', 'Page token to retrieve a specific page of results in the list')
    .param('q', 'String', 'Only return threads matching the specified query. Supports the same query format as the Gmail search box')

schema.type('ThreadPage')
  .computed('items', '[ThreadPageItem]')
  .computed('next', 'ThreadPage*')

schema.type('ThreadPageItem')
  .field('id', 'String', 'The immutable ID of the thread')
  .field('snippet', 'String', 'A short part of the message text')
  .field('historyId', 'Int', 'The ID of the last history record that modified this thread')
  .field('messages', '[Message]', 'The list of messages in the thread')
  .computed('self', 'Thread*', 'A reference to the thread represented by this item')

schema.type('Thread', 'A collection of messages representing a conversation')
  .field('id', 'String', 'The immutable ID of the thread')
  .field('snippet', 'String', 'A short part of the message text')
  .field('historyId', 'Int', 'The ID of the last history record that modified this thread')
  .field('messages', '[Message]', 'The list of messages in the thread')
  .computed('self', 'Thread*', 'A reference to the thread represented by this item')

schema.type('MessageCollection')
  .computed('one', 'Message', 'A message')
    .param('id', 'String', 'The id of the message')
  .computed('page', 'MessagePage', 'All the messages')
    .param('pageSize', 'Int', 'Maximum number of messages to return. Originally "maxResults"')
    .param('includeSpamTrash', 'Boolean', 'Include messages from SPAM and TRASH in the results')
    .param('labelIds', 'String', 'Only return messages with labels that match all of the specified label IDs')
    .param('pageToken', 'String', 'Page token to retrieve a specific page of results in the list')
    .param('q', 'String', 'Only return messages matching the specified query. Supports the same query format as the Gmail search box')
  .action('send')
    .param('to', 'String', 'to email address of the receiver')
    .param('from', 'String', 'from email address of the sender, the mailbox account')
    .param('subject', 'String', 'subject of the email')
    .param('body', 'String', 'body text of the email')
    
schema.type('MessagePage')
  .computed('items', '[MessagePageItem]')
  .computed('next', 'MessagePage*')

schema.type('MessagePageItem')
  .field('id', 'String', 'The immutable ID of the thread')
  .computed('thread', 'Thread*', 'The thread this message belongs to')
  .computed('self', 'Message*', 'A reference to the message represented by this item')

schema.type('Message')
  .field('id', 'String', 'The immutable ID of the message')
  .field('snippet', 'String', 'A short part of the message text')
  .computed('thread', 'Thread*', 'The thread this message belongs to')
  .field('labelIds', '[String]', 'List of IDs of labels applied to this message')
  .field('historyId', 'Int', 'The ID of the last history record that modified this message')
  .field('internalDate', 'String', 'The internal message creation timestamp')
  .field('payload', 'MessagePayload', 'The parsed email structure in the message parts')
  .computed('text', 'String', 'Gets all the text/plain parts concatenated')
  .computed('self', 'Message*', 'A reference to the message represented by this item')

schema.type('LabelCollection')
  .computed('one', 'Label', 'A label')
    .param('id', 'String', 'The id of the label')
  .computed('withName', 'Label*', 'A label with the provided name')
    .param('name', 'String', 'The name of the label')
  .computed('items', '[Label]', 'All the labels')

schema.type('Label')
  .field('id', 'String', 'The immutable ID of the label')
  .field('name', 'String', 'The display name of the label')
  .field('type', 'String', 'The owner type for the lable') // TODO: make this an enum
  .field('messagesTotal', 'Int', 'The total number of messages with the label')
  .field('messagesUnread', 'Int', 'The number of unread messages with the label')
  .field('threadsTotal', 'Int', 'The total number of threads with the label')
  .field('threadsUnread', 'Int', 'The number of unread threads with the label')
  .event('messageAdded', 'Triggered when a message is added to this label')
    .param('message', 'Message*', 'The message that was added to this label')

schema.type('MessagePayload')
  .field('partId', 'String', 'The immutable ID of the message part')
  .field('mimeType', 'String', 'The MIME type of the message part')
  .field('filename', 'String', 'The filename of the attachment')
  .field('headers', 'HeaderCollection', 'The collection of headers on this message part')
  // .field('body', 'Attachment', 'The message part body for this part, which may be empty for container MIME message parts')
  // .field('parts', 'MessagePart', 'The child MIME message parts of this part')

schema.type('HeaderCollection')
  .computed('one', 'Header')
    .param('name', 'String')
  // TODO: See todo below
  .computed('items', '[Header]')

schema.type('Header')
  .field('name', 'String', 'The name of the header before the ":" separator')
  .field('value', 'String', 'The value of the header after the ":" separator')
  // TODO: This is an interesting case for the self property that cannot be
  // implemented at the moment. The "source" arg doesn't have enough information
  // to fully computed "self", a header doesn't know the message it belongs to so
  // we need to look at the ref of the list which is currently not provided to the
  // resolver so we need to fix that
  .computed('self', 'Header*')

