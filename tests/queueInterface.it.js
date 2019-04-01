'use strict';

/* eslint-disable func-names, no-process-env */
require('dotenv').config();

const { expect } = require('chai');
const uuid = require('uuid/v4');
const Promise = require('bluebird');
const { PubSub } = require('@google-cloud/pubsub');

const QueueInterface = require('../queueInterface');

// To ensure we're using the emulator
if (!process.env.PUBSUB_EMULATOR_HOST) {
  throw new Error('must define PUBSUB_EMULATOR_HOST env var');
}

describe('queueInterface client tests', function () {
  this.timeout(20000);
  let queue = null;

  afterEach(async () => {
    await queue.close();
  });

  it('writes message to queue', async () => {
    const pubsub = new PubSub({
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

    const subscriptionId = `a${uuid()}`;
    queue = new QueueInterface(pubsub);
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

  it('reads message from queue', async () => {
    const pubsub = new PubSub({
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

    const subscriptionId = `a${uuid()}`;
    queue = new QueueInterface(pubsub);
    await queue.open(config.queue.topicName);

    const topic = (await pubsub.topic(config.queue.topicName).get({ autoCreate: true }))[0];

    const receivedMessagePromise = new Promise(async (res) => {
      await queue.subscribe((msg) => {
        res(msg);
      }, subscriptionId, 1);
    });

    await topic.publish(Buffer.from(JSON.stringify({ foo: 'bar' })));

    const receivedMessage = await receivedMessagePromise;

    expect(receivedMessage).to.eql({ foo: 'bar' });
  });

  it('pulls message from queue', async () => {
    const pubsub = new PubSub({
      projectId: 'foo',
      credentials: {
        client_email: 'foo@bar.com',
        private_key: 'some-similarityKey',
      },
    });

    const config = {
      queue: {
        topicName: 'foo',
      },
    };

    const subscriptionId = 'bar';
    queue = new QueueInterface(pubsub);
    await queue.open(config.queue.topicName);

    const topic = (await pubsub.topic(config.queue.topicName).get({ autoCreate: true }))[0];

    // If we create the subscription early, then the published messages will accumulate
    await topic.subscription(subscriptionId, { flowControl: { maxMessages: 1 } }).get({ autoCreate: true });

    await topic.publish(Buffer.from(JSON.stringify({ foo: 'bar1' })));
    await topic.publish(Buffer.from(JSON.stringify({ foo: 'bar2' })));
    expect(await queue.subscribeOnce(subscriptionId)).to.eql({ foo: 'bar1' });
    expect(await queue.subscribeOnce(subscriptionId)).to.eql({ foo: 'bar2' });

    await topic.publish(Buffer.from(JSON.stringify({ foo: 'bar3' })));
    expect(await queue.subscribeOnce(subscriptionId)).to.eql({ foo: 'bar3' });
    expect(await queue.subscribeOnce(subscriptionId, 100)).to.eql(null);

    await topic.publish(Buffer.from(JSON.stringify({ foo: 'bar6' })));
    expect(await queue.subscribeOnce(subscriptionId)).to.eql({ foo: 'bar6' });
    expect(await queue.subscribeOnce(subscriptionId, 100)).to.eql(null);
  });

  it('stops listening to queue on close', async () => {
    const pubsub = new PubSub({
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

    const subscriptionId = 'bar';
    queue = new QueueInterface(pubsub);
    await queue.open(config.queue.topicName);

    const topic = (await pubsub.topic(config.queue.topicName).get({ autoCreate: true }))[0];

    // If we create the subscription early, then the published messages will accumulate
    await topic.subscription(subscriptionId, { flowControl: { maxMessages: 1 } }).get({ autoCreate: true });

    const waiting = queue.subscribeOnce(subscriptionId);
    await Promise.delay(100);

    await queue.close();

    expect(await waiting).to.eql(null);
  });
});
