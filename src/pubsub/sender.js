const amqp = require('amqplib/callback_api');

const QUEUE = 'PUBSUB';

const sender = (operation, planData) => {
  const message = {
    operation,
    body: planData
  };

  amqp.connect('amqp://localhost', (error0, connection) => {
    if (error0) {
      throw error0;
    }

    connection.createChannel((error1, channel) => {
      if (error1) {
        throw error1;
      }

      channel.assertQueue(QUEUE, { durable: false });

      const payload = JSON.stringify(message);
      channel.sendToQueue(QUEUE, Buffer.from(payload));
      console.log(`[x] Sent to queue: ${payload}`);
    });

    setTimeout(() => {
      connection.close();
    }, 500);
  });
};

module.exports = sender;
