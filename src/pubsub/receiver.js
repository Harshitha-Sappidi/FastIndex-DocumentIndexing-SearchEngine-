const amqp = require('amqplib/callback_api');
const { postDocument, deleteDocument } = require('../services/elasticsearch.service');

const QUEUE = 'PUBSUB';

const receiver = () => {
  amqp.connect('amqp://localhost', (error0, connection) => {
    if (error0) {
      throw error0;
    }

    connection.createChannel((error1, channel) => {
      if (error1) {
        throw error1;
      }

      channel.assertQueue(QUEUE, { durable: false });

      channel.consume(QUEUE, async (msg) => {
        if (!msg) return;

        try {
          const { operation, body } = JSON.parse(msg.content.toString());
          let response;

          if (operation === 'POST') {
            response = await postDocument(body);
          } else if (operation === 'DELETE') {
            response = await deleteDocument(body);
          }

          if (response?.statusCode === 200 || response?.result === 'deleted') {
            channel.ack(msg);
            channel.checkQueue(QUEUE, (err, ok) => {
              if (!err && ok) {
                console.log(`Remaining messages: ${ok.messageCount}`);
              }
            });
          } else {
            console.error('Elasticsearch operation failed:', response);
          }
        } catch (err) {
          console.error('Error processing message:', err.message);
        }
      }, { noAck: false });
    });
  });
};

module.exports = receiver;
