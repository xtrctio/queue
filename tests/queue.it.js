'use strict';

/* eslint-disable func-names, no-process-env */
require('dotenv').config();

const { expect } = require('chai');
const uuid = require('uuid/v4');
const Promise = require('bluebird');

const Queue = require('../index');

// To ensure we're using the emulator
if (!process.env.PUBSUB_EMULATOR_HOST) {
  throw new Error('must define PUBSUB_EMULATOR_HOST env var');
}

describe('queue client tests', function () {
  this.timeout(20000);
  let queue = null;

  afterEach(async () => {
    await queue.close();
  });

  it('writes message to queue', async () => {
    queue = new Queue({
      projectId: 'foo',
      credentials: {
        client_email: 'foo@bar.com',
        private_key: 'some-similarityKey',
      },
    });

    const config = {
      queue: {
        topicName: `a${uuid()}`,
      },
    };

    const pubsub = queue._pubsub;

    const subscriptionId = `a${uuid()}`;
    await queue.open(config.queue.topicName);

    const topic = (await pubsub.topic(config.queue.topicName).get({ autoCreate: true }))[0];

    const subscription = (await topic.subscription(subscriptionId, { flowControl: { maxMessages: 1 } }).get({ autoCreate: true }))[0];

    const receivedMessagePromise = new Promise((res) => {
      subscription.once('message', (msg) => {
        msg.ack();
        res(JSON.parse(msg.data.toString()));
      });
    });

    await queue.write({ foo: 'bar' });

    const receivedMessage = await receivedMessagePromise;

    expect(receivedMessage).to.eql({ foo: 'bar' });
  });
});
