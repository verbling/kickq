# Kickq API Scaffolding

Kick jobs out the door. Quickly.
A job queue for node.

## Configuration
```js
var kickq = require('kickq');

kickq.config({
  redisNamespace: 'kickq'
});

kickq.config('redisNamespace', 'kickq');

// can add config parameters run-time
kickq.config(anotherConfigObject);

// reset all config params, return to original state.
kickq.reset();

```

### Configuration Options

#### Option :: `redisPort`

**Type**: `number` **Default**: `6389`

Define a different port for redis.

#### Option :: `redisHost`

**Type**: `string` **Default**: `"127.0.0.1"`

Define a different host for redis.

#### Option :: `redisPassword`

**Type**: `string | null` **Default**: `null`

Set a redis password if you have one.

#### Option :: `redisOptions`

**Type**: `Object | null` **Default**: `null`

More specific options for the redis client [as defined in the redis package docs](https://github.com/mranney/node_redis#rediscreateclientport-host-options).


#### Option :: `redisNamespace`

**Type**: `string` **Default**: `"kickq"`

Define the master key namespace for redis, that kickq will use to store data.

#### Option :: `debug`

**Type**: `boolean` **Default**: `false`

Will enable logging to console and log all messages generated.

#### Option :: `purgeTimeout`

**Type**: `number` **Default**: `86400000` (milliseconds, default is 1 day)

When a job completes it moves to the purge queue. This timeout defines the time to wait before actually deleting the job record from redis.

#### Option :: `processTimeout`
**Type**: `number` **Default**: `10000` (milliseconds) **✓ per job option**

The global timeout for processing tasks, in milliseconds.

#### Option :: `delay`
**Type**: `?number` **default** `null` **✓ per job option**

Delay queuing for processing of jobs.

#### Option :: `ghostRetry`
**Type**: `boolean` **default** `true` **✓ per job option**

A job gets ghosted when the process function does not invoke the callback or return a promise, triggering the `processTimeout` limit.

#### Option :: `ghostTimes`
**Type**: `number` **default** `1` **✓ per job option**

How many times to retry processing a ghost job.

#### Option :: `ghostInterval`
**Type**: `number` **default** `1800000` (ms, half an hour) **✓ per job option**

A job gets ghosted when the process function does not invoke the callback or return a promise, triggering the `processTimeout` limit.


#### Option :: `hotjob`
**Type**: `boolean` **default** `false` **✓ per job option**

Tombstoning allows for *run-time* invocation of the new job. The job creator has a chance to wait for the completion of the new job within the timeout defined.

#### Option :: `hotjobTimeout`
**Type**: `number` **default** `10000` (milliseconds) **✓ per job option**

Time to wait for a job to get processed before hotjob callbacks timeout, in milliseconds.

#### Option :: `retry`
**Type**: `boolean` **default** `false` **✓ per job option**

Allow for a failed job to retry execution.

#### Option :: `retryTimes`
**Type**: `number` **default** `3` **✓ per job option**

How many times to retry before finally giving up

#### Option :: `retryInterval`
**Type**: `number` **default** `180000` (ms, half an hour) **✓ per job option**

How long to wait before retrying in milliseconds.

TODO: accept a function as value, which returns a number.


#### Option :: `jobFlags`

**Type**: `Object` **Default**: None

Allow options per job type. Each key represents a job type.

You can use any of the options marked with **✓ per job option** from the list above, options are applied cascadingly with the more specific overiding.

```js
kickq.config({

  jobFlags: {
    'job name': {
      // all options that allow "per job" configuration, e.g:
      retry: true,
      retryCount: 1
    }
  }
});
```

### Scheduler Options

#### Option :: 'schedulerOn'
**Type**: `boolean` **Default**: `true`

If this worker will also launch the scheduler loop.

#### Option :: 'schedulerInterval'
**Type**: `number` **Default**: `1000` milliseconds

The interval the scheduler will check for jobs that need to be queued.

#### Option :: 'schedulerFuzz'
**Type**: `number` **Default**: `300` milliseconds

The fuzz factor is to create some randomness in the interval so multiple workers will have a chance to spread out evenly. An interval of 1000 with a fuzzy factor of 300 means that the actual interval for scheduler checks will be anywhere between 700 and 1,300 milliseconds.

#### Option :: 'schedulerLookAhead'
**Type**: `number` **Default**: `1500` milliseconds

When actually performing a db query, how far ahead to look for jobs that need to be moved to the process queue. Rule of thumb = `(schedulerInterval + schedulerFuzz) * ~15%`.


### Logger Options

Kickq exposes a robust logging facility. The messages that kickq generates range from Severe errors, failing database, failed saving etc. Down to code debugging messages. The levels are represented by an integer, ranging from 0 (less important) to 1000 (severe).

All levels are exposed as an enume by `kickq.LogLevel`:

```js
  // Values of the LogLevel Enum
  kickq.LogLevel.SEVERE   = 1000;
  kickq.LogLevel.DATABASE =  900;
  kickq.LogLevel.WARN     =  800;
  kickq.LogLevel.INFO     =  600;
  kickq.LogLevel.FINE     =  400;
  kickq.LogLevel.FINER    =  200;
  kickq.LogLevel.FINEST   =  100;
```

#### Option :: 'loggerConsole'
**Type**: `boolean` **Default**: `false`

Log to console too, uses the `loggerLevel`.

#### Option :: 'loggerLevel'
**Type**: `boolean` **Default**: `800` (kickq.LogLevel.WARN)

The minimum Logging Level messages that kickq will emit. The `debug` option overwrites this to `0`.

#### Option :: 'loggerDb'
**Type**: `boolean` **Default**: `true`

Save the log to the db.

#### Option :: 'loggerDbLevel'
**Type**: `number` **Default**: `800` (kickq.LogLevel.WARN)

The minimum Logging Level that will get stored. The `debug` option overwrites this to `0`.

#### Option :: 'loggerFile'
**Type**: `boolean` **Default**: `false` milliseconds

Save the log to file. Only **warning** or **severe** level messages are saved.

#### Option :: 'loggerFilename'
**Type**: `string` **Default**: `"./log/kickq.log"`

The logging file name.

#### Option :: 'loggerFileLevel'
**Type**: `number` **Default**: `800` (kickq.LogLevel.WARN)

The minimum Logging Level that will get stored. The `debug` option overwrites this to `0`.



### Advanced Options

#### Option :: 'fetchTimeout'
**Type**: `number` **Default**: `0` **seconds**, 0 for ever

The [redis' `blpop` timeout](http://redis.io/commands/blpop). Used for fetching the next job in the queue, 0 means indefinite wait.

## Creating a Job

```js
var kickq = require('kickq');

var data = {some:'stuff'};

// this is delayed by x amount of time from scheduling time
var opts = {delay: 1000 };

kickq.create('job name', data, opts, function(err, job) {
  // err = is something went wrong
  // job = A job item, see bellow.
});
```

Read more about the callback's argument `job` in [The Job Item](#the-job-item).

All Job options marked with **✓ per job option** can be used for each job individually, [check out all the options](#configuration-options).

### Danger Zone

`data`, `opts` and `callback` are all optional, this will work:

```js
kickq.create('job name');
```

But this will result in unexpected behavior:
```js
// DO NOT DO THIS
kickq.create('job name', opts);

// Do this instead if no data:
kickq.create('job name', null, opts);

```




### Create a hotjob

A hotjob is a job that the initiator waits with a callback for the job completion. A timeout ensures that the callback will eventually be called.


```js
/**
 * Callback when the job completes.
 * That includes failed or successfull processing.
 *
 * @param {Kickq.Job} job A response object.
 */
function fnOnJobComplete(job) {};

/**
 * Callback for when the job eventually fails or timeouts.
 *
 * @param  {kickq.error.JSON|kickq.error.Timeout}  err The error object.
 */
function fnOnJobFailed(err) {};

var opts = {
  hotjob: true,
  hotjobTimeout: 10000 // 10 seconds, default set via kickQ.config()
};
kickq.create('job name', data, opts, function(err, job, hotjobPromise) {
  job.hotjobPromise === hotjobPromise; // same reference

  hotjobPromise.then(fnOnJobComplete, fnOnJobFailed);
});
```
Read more about the callback's argument `job` in [The Job Item](#the-job-item).


#### Set hotjob Flag on Job Types

Set a default hotjob flag per job type via config:

```js
var kickq = require('kickq');

kickq.config({
  jobFlags: {
    'job name': {
      hotjob: true,
      hotjobTimeout: 10000 // 10 seconds
    }
  }
});
```


### Create a Job With Retries

```js
var opts = {
  retry: true,
  retryCount: 5 // times, default for job set via kickQ.config()
};
kickq.create('job name', data, opts);
```

Or set a default retry flag per job type via config:

```js
var kickq = require('kickq');

kickq.config({
  jobFlags: {
    'job name': {
      retry: true,
      retryCount: 5,
      retryInterval: 1800 // (half an hour)
    }
  }
});
```

### Job Create Returns a Promise

```js
// data, options and callback are all optional
var createPromise = kickq.create('job name');

createPromise.then(handleResolve, handleFail);

function handleResolve(job) {
  console.log(job.id);
}

function handleFail(err) {
  // do something with err
}
```

Create multiple jobs:

```js
var createPromises = [];

createPromises.push( kickq.create('job one') );
createPromises.push( kickq.create('job two') );
createPromises.push( kickq.create('job three') );
createPromises.push( kickq.create('job four') );

when.all(createPromises).then(function(jobs){
  jobs[0].name === 'job one';
  jobs[1].name === 'job two';
  jobs[2].name === 'job three';
  jobs[3].name === 'job four';
}));

```


## Process job
```js
// options for what jobs are assigned to the worker and how.
var options = {
  concurrentJobs: 10 // total number of concurent jobs
}

// first argument can be a string or an array of strings.
kickq.process(['job name'], options, processJob);

// options can be ommited
kickq.process(['another job name'], processJob);

function processJob(job, data, cb) {
  // job is an instance of Kickq.Job
  job.id; // the id
  job.name; // the job's name
  job.data === data; // same reference


  cb('error'); // <-- error
  cb(false); // <-- error
  cb(); // <-- no error

  // <-- no error and callback when post-process db ops are done
  cb(null, function(){});
}
```

> **Beware** If you provide an array of job names, sequence matters! Jobs will be fetched in sequence as per [redis' blpop ordering](http://redis.io/commands/blpop).

### Process a Job Using a Promise

```js
kickq.process(['another job name'], processJob);

function processJob(job, data, cb) {
  // Create a deferred object
  var deferred = when.defer();

  anAsyncOperation(function() {

    deferred.resolve(); // complete the job successfully
    deferred.reject('error message'); // fail the job

  });

  return deferred.promise;
}
```

## Delete a job
```js
k.delete(job.id);
```

## The Job Item

The *Job Item* contains all the essential information of a job. It is passed on every Kickq callback. The Job Item object is dispensable, it is a clone of the actual job item instance so you can manipulate it freely.

This is the breakout:

```js
// job
{
  id: '0', // {string | null} the job id, null on error.
  name: 'job name', // {string} the job name.
  complete: false, // {boolean} irrespective of success / fail.
  success: false, // {boolean} turns true when complete and executed with success.
  createTime: 1364226587925, // {number} JS timestamp.
  finishTime: null, // {number | null} JS timestamp or null.
  totalProcessTime: null, // {number | null} total process time in ms or null.

  // the state can be one of:
  //   - new
  //   - queued :: A job has been queued for re-processing
  //   - delayed
  //   - processing
  //   - retry
  //   - ghost   :: A re-process state when callback does not report.
  //   - success :: 'complete' flag is true
  //   - fail    :: 'complete' flag is true
  state: 'new',

  delay: null, // {number | null} Delay in milliseconds.

  retry: false, // {boolean} If this job will retry.
  retryCount: 5, // {number} How many times to retry.
  retryInterval: 1800000, // {number} milliseconds of interval between retrying.

  hotjob: false, // {boolean} If this is a hotjob.
  hotjobTimeout: 10000, // {number} milliseconds.
  hotjobPromise: null, // {when.Promise|null} The hotjob promise.

  data: null, // {*} Any type, passed data on job creation

  // {number | null} JS timestamp of when this job has been scheduled for.
  scheduledFor: null,

  // Processing runs performed for this job. Can be 1 up to n retries.
  // When the job is new this is an empty array.
  runs: [
    // a process item
    {
      count: 1, // {number} the process count of this process item.
      start: 1364226587925, // {number} JS timestamp
      time: null, // {?number} Processing time in ms or null

      // same as job.state except states: 'new', 'delayed', 'retry'
      state: 'processing'
    }
  ]
}

```

## Notes

### Problems Kue has we want to solve
* There's a lot of effort on UI vs functionality
* There are old jobs hanging
* There are unaddressed bugs
* There is no cron functionality
* It is no longer maintained


### Nice to have:
* Retry
* Tombstoning
* Simple aggregation stats


## Tests

Use the following command to target specific tests:

```shell
mocha -b test/spec/createJobs.test.js -u tdd -g " 1.4.4"
```

Checkout the *markdown* [output of tests](testdoc.md)
