import amqp from 'amqplib';
import config from '../config/local.js';
import { postDocument, deleteDocument } from './elasticsearch.service.js';

const QUEUE_NAME = config.RABBITMQ_QUEUE_NAME;
const EXCHANGE_TYPE = config.RABBITMQ_EXCHANGE_TYPE;
const EXCHANGE_NAME = config.RABBITMQ_EXCHANGE_NAME;
const KEY = config.RABBITMQ_KEY;

let channel;

const setupChannel = async () => {
  const connection = await amqp.connect('amqp://localhost');
  channel = await connection.createChannel();
  await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE);
  await channel.assertQueue(QUEUE_NAME);
  channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, KEY);
};

await setupChannel(); // 👈 immediately connect on import

const producer = (content) => {
  channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(content)));
};

const consumer = async () => {
  return await channel.consume(QUEUE_NAME, async (message) => {
    const content = message.content.toString();
    channel.ack(message);

    const { operation, body } = JSON.parse(content);

    if (operation === 'STORE') {
      await postDocument(body);
    } else if (operation === 'DELETE') {
      await deleteDocument(body);
    }
  });
};

export { producer, consumer };
