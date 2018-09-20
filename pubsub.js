// import * as pubsub from "@google-cloud/pubsub";
const pubsub = () => {}

const serviceAccountJson = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);

const config = {
  keyFilename: serviceAccountJson
};

let client = pubsub(config);

export async function topic(args) {
  const [topic, response] = await client.topic(args.name).get();
  return topic;
}

export async function createTopic(args) {
  const [topic, response] = await client.topic(args.name).create();
}

export function getTopicName(topicName) {
  return topicName.replace("membrane-driver-", "");
}

export function getSubscriptionName(topicName) {
  return "membrane-driver-" + topicName;
}

export async function createSubscription(name, topic, pushEndpoint) {
  const [subscription, response] = await client.subscribe(topic, name, {
    pushEndpoint
  });
}

export async function deleteSubscription(name, topic) {
  const [response] = await client
    .topic(topic)
    .subscription(name)
    .delete();
}
