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


#### Option `redisNamespace`

**Type**: `string` **Default**: `kickq`

Define the master key namespace for redis, that kickq will use to store data.

#### Option `jobFlags`

**Type**: `Object` **Default**: None

Allow for job specific configuration options. Each key of the `Object` references a *job name* and the value is another Object with the required job specific options. Find an example with all available job-specific options:

```js
KickQ.config({
  jobFlags: {
    'job name': {
      // tombstoning allows for *run-time* invocation of the new job.
      // The job creator has a chance to wait for the completion of the
      // new job within the timeout defined.
      tombstone: true, // default: false

      // the tombstoning timeout in seconds.
      tombstoneTimeout: 10, // default: 10

      // Allow for a failed job to retry execution.
      retry: true, // default: false

      // how many times to retry before finally giving up
      retryCount: 3, // default: 3

      // How long to wait before retrying in seconds.
      // TODO: accept as value a function that returns a number.
      retryInterval: 1800 // default: 1800 (half an hour)
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

### Create a Tombstoning Job

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

  // or use a promise
  var deferred = when.defer();

  deferred.resolve(); // complete the job successfully
  deferred.reject('error message'); // fail the job

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
