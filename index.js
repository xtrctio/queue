'use strict';

const { PubSub } = require('@google-cloud/pubsub');
const QueueInterface = require('./queueInterface');

/**
 * @class
 */
class Queue extends QueueInterface {
  /**
   * @param {ClientConfig} config
   */
  constructor(config) {
    super(new PubSub(config));
  }
}

module.exports = Queue;
