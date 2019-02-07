# queue
QueueInterface wrapper to expose standard interface

## Usage
```javascript
const Queue = require('@xtrctio/queue');

const queue = new Queue(pubsubConfig);

(async () => {
    await queue.open('some-topic');

    await queue.write({something: 'foo'});

    // Would receive something like: {something: 'foo'}
    const message = await queue.subscribeOnce('subscription-id');

    const messageProcessor = (message) => {};
    await queue.subscribe(messageProcessor, 'subscription-id');
})();
```

## Classes

<dl>
<dt><a href="#QueueInterface">QueueInterface</a></dt>
<dd></dd>
<dt><a href="#Queue">Queue</a></dt>
<dd></dd>
</dl>

<a name="QueueInterface"></a>

## QueueInterface
**Kind**: global class  

* [QueueInterface](#QueueInterface)
    * [new QueueInterface(pubsub)](#new_QueueInterface_new)
    * [.open(topicName)](#QueueInterface+open) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.write(messageObject)](#QueueInterface+write) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.subscribe(messageProcessor, subscriptionId, [maxMessages])](#QueueInterface+subscribe) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.subscribeOnce(subscriptionId, [timeoutMs])](#QueueInterface+subscribeOnce) ⇒ <code>Promise.&lt;(object\|null)&gt;</code>
    * [.close()](#QueueInterface+close) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="new_QueueInterface_new"></a>

### new QueueInterface(pubsub)

| Param | Type |
| --- | --- |
| pubsub | <code>PubSub</code> | 

<a name="QueueInterface+open"></a>

### queueInterface.open(topicName) ⇒ <code>Promise.&lt;void&gt;</code>
Open queue for reading/writing

**Kind**: instance method of [<code>QueueInterface</code>](#QueueInterface)  

| Param | Type |
| --- | --- |
| topicName | <code>string</code> | 

<a name="QueueInterface+write"></a>

### queueInterface.write(messageObject) ⇒ <code>Promise.&lt;void&gt;</code>
Write object to queue

**Kind**: instance method of [<code>QueueInterface</code>](#QueueInterface)  

| Param | Type |
| --- | --- |
| messageObject | <code>object</code> | 

<a name="QueueInterface+subscribe"></a>

### queueInterface.subscribe(messageProcessor, subscriptionId, [maxMessages]) ⇒ <code>Promise.&lt;void&gt;</code>
Subscribe to messages in a topic

**Kind**: instance method of [<code>QueueInterface</code>](#QueueInterface)  

| Param | Type | Default |
| --- | --- | --- |
| messageProcessor | <code>function</code> |  | 
| subscriptionId | <code>string</code> |  | 
| [maxMessages] | <code>number</code> | <code>1</code> | 

<a name="QueueInterface+subscribeOnce"></a>

### queueInterface.subscribeOnce(subscriptionId, [timeoutMs]) ⇒ <code>Promise.&lt;(object\|null)&gt;</code>
Subscribe until a single message is received
NOTE: This should not be used for high-frequency processing.
The intention is to start a subscription and wait for the first message, then spend a long time processing it.

**Kind**: instance method of [<code>QueueInterface</code>](#QueueInterface)  
**Returns**: <code>Promise.&lt;(object\|null)&gt;</code> - message object, or null if timeout  

| Param | Type | Default |
| --- | --- | --- |
| subscriptionId | <code>string</code> |  | 
| [timeoutMs] | <code>number</code> \| <code>null</code> | <code></code> | 

<a name="QueueInterface+close"></a>

### queueInterface.close() ⇒ <code>Promise.&lt;void&gt;</code>
Close queue

**Kind**: instance method of [<code>QueueInterface</code>](#QueueInterface)  
<a name="Queue"></a>

## Queue
**Kind**: global class  
<a name="new_Queue_new"></a>

### new Queue(config)

| Param | Type |
| --- | --- |
| config | <code>ClientConfig</code> | 

