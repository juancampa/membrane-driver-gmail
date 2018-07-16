import * as pubsub from "@google-cloud/pubsub";

const env = process.env;

const config = {
	projectId: env.projectId,
	credentials: {
		client_email: env.clientEmail,
		private_key: env.privateKey
	}
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
    const [subscription, response] = await client.subscribe(topic, name, { pushEndpoint });
}
