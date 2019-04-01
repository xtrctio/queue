'use strict';

const _ = require('lodash');
const XError = require('@xtrctio/xerror');
const Promise = require('bluebird');

const log = require('./logger');

/**
 * @class
 */
class QueueInterface {
  /**
   * @param {PubSub} pubsub
   */
  constructor(pubsub) {
    if (!_.isObject(pubsub)) {
      throw new Error('pubsub must be an object');
    }

    this._pubsub = pubsub;

    this.isReady = false;

    this._topic = null;
    this._subscription = null;
    this._registeredMsgProcessor = null;
  }

  /**
   * Open queue for reading/writing
   * @param {string} topicName
   * @returns {Promise<void>}
   */
  async open(topicName) {
    if (!_.isString(topicName)) {
      throw new Error('topicName must be a string');
    }

    [this._topic] = (await this._pubsub.topic(topicName).get({ autoCreate: true }));
    this.isReady = true;
  }

  /**
   * Write object to queue
   * @param {object} messageObject
   * @returns {Promise<void>}
   */
  async write(messageObject) {
    if (!this.isReady) {
      throw new XError('queue is not ready, ensure open() has been called');
    }

    if (!_.isObject(messageObject)) {
      throw new XError('messageObject must be an object');
    }

    await this._topic.publish(Buffer.from(JSON.stringify(messageObject)));
  }

  /**
   * Received raw queue message, parse, handle errors, and ack
   * @param {PubsubMessage} message
   * @param {Function} msgProcessor
   * @returns {Promise<object>}
   * @private
   */
  static async _subscribeMessageProcessor(message, msgProcessor) {
    if (!_.isFunction(msgProcessor)) {
      throw new XError(`_msgProcessor must be a function ${msgProcessor}`);
    }

    return Promise.try(() => msgProcessor(JSON.parse(message.data.toString())))
      .then(() => message.ack())
      .catch((error) => {
        log.error(`Rejected error while calling msgProcessor: ${error}`);
        return _.isFunction(message.nack) && message.nack();
      });
  }

  /**
   * Received raw queue response, parse, handle errors, and ack
   * @param {PubsubMessage} response
   * @returns {Promise<object>}
   * @private
   */
  async _pullMessageProcessor(response) {
    if (!response) {
      return null;
    }

    await this._subscriber.acknowledge({
      subscription: this._subscription.name,
      ackIds: [response.ackId],
    });

    return JSON.parse(response.message.data.toString());
  }

  /**
   * Simple error handler
   * @param {Error} err
   * @returns {void}
   * @private
   */
  static _subscriptionErrorHandler(err) {
    log.error(`Error with subscription: ${err}`);
  }

  /**
   * Subscribe to messages in a topic
   * @param {Function} messageProcessor
   * @param {string} subscriptionId
   * @param {number} [maxMessages=1]
   * @returns {Promise<void>}
   */
  async subscribe(messageProcessor, subscriptionId, maxMessages = 1) {
    const self = this;
    if (!_.isFunction(messageProcessor)) {
      throw new XError('messageProcessor must be a function');
    }

    if (!this.isReady) {
      throw new XError('queue is not ready, ensure open() has been called');
    }

    if (this._subscription) {
      throw new XError('_subscription already exists, create new queue for new subscription');
    }
    this._registeredMsgProcessor = (msg) => QueueInterface._subscribeMessageProcessor(msg, messageProcessor);
    [this._subscription] = (await this._topic.subscription(subscriptionId, { flowControl: { maxMessages } }).get({ autoCreate: true }));

    this._subscription.on('message', self._registeredMsgProcessor);
    this._subscription.on('error', QueueInterface._subscriptionErrorHandler);
  }

  /**
   * Subscribe until a single message is received
   * NOTE: This should not be used for high-frequency processing.
   * The intention is to start a subscription and wait for the first message, then spend a long time processing it.
   *
   * @param {string} subscriptionId
   * @param {number|null} [timeoutMs=null]
   * @returns {Promise<object|null>} message object, or null if timeout
   */
  async subscribeOnce(subscriptionId, timeoutMs = null) {
    const self = this;

    if (timeoutMs && (!_.isInteger(timeoutMs) || timeoutMs < 0)) {
      throw new XError('if provided, timeoutMs should be a positive integer');
    }

    if (!this.isReady) {
      throw new XError('queue is not ready, ensure open() has been called');
    }

    if (this._subscription) {
      throw new XError('_subscription already exists, close previous one or create new instance');
    }

    [this._subscription] = (await this._topic.subscription(subscriptionId, { flowControl: { maxMessages: 1 } }).get({ autoCreate: true }));

    return new Promise((res) => {
      let subscribeTimeout;

      const errorHandler = async (err) => {
        QueueInterface._subscriptionErrorHandler(err);
        // eslint-disable-next-line no-use-before-define
        await unregister();
        res(null);
      };

      const unregister = async () => {
        if (subscribeTimeout) {
          clearTimeout(subscribeTimeout);
        }

        this._subscription.removeListener('message', self._registeredMsgProcessor);
        this._subscription.removeListener('error', errorHandler);
        this._subscription = null;
      };

      this._subscription.unsubscribe = async () => {
        await unregister();
        return res(null);
      };

      this._registeredMsgProcessor = async (msg) => {
        await unregister();
        return QueueInterface._subscribeMessageProcessor(msg, res);
      };

      this._subscription.once('message', self._registeredMsgProcessor);
      this._subscription.once('error', errorHandler);

      if (timeoutMs) {
        subscribeTimeout = setTimeout(async () => {
          log.warn('Timed out waiting for message');
          await unregister();
          res(null);
        }, timeoutMs);
      }
    });
  }

  /**
   * Close queue
   * @returns {Promise<void>}
   */
  async close() {
    const self = this;

    log.info('Closing queue..');

    if (this._subscription) {
      if (this._subscription && this._subscription.unsubscribe) {
        await this._subscription.unsubscribe();
      }

      if (this._subscription && self._registeredMsgProcessor) {
        this._subscription.removeListener('message', self._registeredMsgProcessor);
      }

      if (this._subscription) {
        this._subscription.removeListener('error', QueueInterface._subscriptionErrorHandler);
      }
    }

    this._subscription = null;
    this._topic = null;

    this.isReady = false;

    log.info('Queue closed');
  }
}

module.exports = QueueInterface;
