# kickq API Scaffolding

Kick jobs out the door. Quickly.
A job queue for node.

## Configuration
```js
var Kickq = require('kickq');

Kickq.config({
  redis: config.redis
});

// can add config parameters run-time
Kickq.config(anotherConfigObject);

// reset all config params, return to original state.
Kickq.reset();

```

### Configuration Options


#### Option :: `redisNamespace`

**Type**: `string` **Default**: `"kickq"`

Define the master key namespace for redis, that kickq will use to store data.

#### Option :: `processTimeout`
**Type**: `number` **Default**: `600` (10s) **✓ per job option**

The global timeout for processing tasks, in seconds.

#### Option :: `delay`
**Type**: `?number` **default** `null` **✓ per job option**

Delay queuing for processing of jobs.

#### Option :: `ghostRetry`
**Type**: `boolean` **default** `true` **✓ per job option**

A job gets ghosted when the process function does not invoke the callback or return a promise, triggering the `processTimeout` limit.

#### Option :: `ghostCount`
**Type**: `number` **default** `1` **✓ per job option**

How many times to retry processing a ghost job.

#### Option :: `ghostInterval`
**Type**: `number` **default** `1800` (half an hour) **✓ per job option**

A job gets ghosted when the process function does not invoke the callback or return a promise, triggering the `processTimeout` limit.


#### Option :: `tombstone`
**Type**: `boolean` **default** `false` **✓ per job option**

Tombstoning allows for *run-time* invocation of the new job. The job creator has a chance to wait for the completion of the new job within the timeout defined.

#### Option :: `tombstoneTimeout`
**Type**: `number` **default** `10` (seconds) **✓ per job option**

Time to wait for a job to get processed before tombstone callbacks timeout, in seconds.

#### Option :: `retry`
**Type**: `boolean` **default** `false` **✓ per job option**

Allow for a failed job to retry execution.

#### Option :: `retryCount`
**Type**: `number` **default** `3` **✓ per job option**

How many times to retry before finally giving up

#### Option :: `retryInterval`
**Type**: `number` **default** `1800` (half an hour) **✓ per job option**

How long to wait before retrying in seconds.

TODO: accept a function as value, which returns a number.


#### Option :: `jobFlags`

**Type**: `Object` **Default**: None

Allow options per job type. Each key represents a job type.

You can use any of the options marked with **✓ per job option** from the list above, options are applied cascadingly with the more specific overiding.

```js
KickQ.config({

  jobFlags: {
    'job name': {
      // all options that allow "per job" configuration, e.g:
      retry: true,
      retryCount: 1
    }
  }
});
```


## Creating a Job

```js
var Kickq = require('kickq');

var kickq = new Kickq();

var data = {some:'stuff'};

// this is delayed by x amount of time from scheduling time
var opts = {delay: 1000 };

kickq.create('job name', data, opts, function(err, job) {
  // err = is something went wrong
  // job = The Kickq.Job instance, see bellow.
});
```

Read more about the callback's argument `job` in [The Job Instance](#the-job-instance).

All Job options marked with **✓ per job option** can be used for each job individually, [check out all the options](#configuration-options).

### Create a Tombstoning Job (!! CHECK CHECK !!)

> **CHECK CHECK** I did a fast check for the tombstoning term and didn't find lots of relevant examples. Should we consider renaming this featureset ?

```js
/**
 * Callback when the job completes
 * @param {Kickq.Job} job A response object.
 */
function fnOnJobComplete(job) {};

/**
 * Callback for when the job eventually fails or timeouts

 * @param  {string}  err The error message
 * @param  {boolean} hasTimeout Indicates if the job timed-out.
 */
function fnOnJobFailed(err, hasTimeout) {};


var opts = {
  tombstone: true,
  tombstoneTimeout: 10 // seconds, default set via kickQ.config()
};
kickq.create('job name', data, opts, function(err, job, tombPromise) {
  job.tombPromise === tombPromise; // same reference

  tombPromise.then(fnOnJobComplete, fnOnJobFailed);
});
```
Read more about the callback's argument `job` in [The Job Instance](#the-job-instance).


#### Set Tombstone Flag on Job Types

Set a default tombstone flag per job type via config:

```js
var KickQ = require('kickq');

KickQ.config({
  jobFlags: {
    'job name': {
      tombstone: true,
      tombstoneTimeout: 10
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
var KickQ = require('kickq');

KickQ.config({
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
  maxJobsNum: 10 // total number of concurent jobs
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
  cb(); // <-- no error
}
```

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

## The Job Instance

The *Job Instance* contains all the essential information of a job. It is passed on every Kickq callback. All properties are read-only, the only way you can interact with the *Job Instance* is by invoking its methods.

This is the breakout:

```js
// job
{
  id: '0', // {string} the job id
  name: 'job name', // {string} the job name
  complete: false, // {boolean} irrespective of success / fail
  success: false, // {boolean} turns true when complete and executed with success
  createTime: 1364226587925, // {number} JS timestamp
  finishTime: null, // {?number} JS timestamp or null

  // the state can be one of:
  //   - new
  //   - delayed
  //   - processing
  //   - retrying
  //   - ghost   :: A re-process state when callback does not report.
  //   - success :: 'complete' flag is true
  //   - fail    :: 'complete' flag is true
  state: 'new',

  retry: false, // {boolean} If this job will retry
  retryCount: 5, // {number} How many times to retry
  retryInterval: 1800 // {number} seconds of interval between retrying
  tombstone: false, // {boolean} ???? RENAME???
  tombstoneTimeout: 10, // {number} seconds
  tombPromise: null, // {?when.Promise} Tombstone promise

  data: null, // {*} Any type, passed data on job creation

  // processing runs performed for this job. Can be 1 up to n retries.
  runs: [

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
