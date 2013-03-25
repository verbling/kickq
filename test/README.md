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

kickq.create('job name', data, opts, function(err, id) {
  // err = is something went wrong
  // id = the id of the job that can be used to delete a job
});
```


### Create a Tombstoning Job

```js

/**
 * Callback when the job completes
 * @param  {Object} respObj A response object.
 */
function fnOnJobComplete(respObj) {
  // breakout of respObj
  respObj = {
    id: 0, // number, the unique id of the job.
    jobName: 'job name', // string, job's name
    complete: true // if job is complete, if false means tombstoneTimeout expired
  };
};

/**
 * Callback for when the job eventually fails or timeouts

 * @param  {string}  err The error message
 * @param  {boolean} hasTimeout Indicates if the job timed-out.
 */
function fnOnJobFailed(err) {};


var opts = {
  tombstone: true,
  tombstoneTimeout: 10 // seconds, default set via kickQ.config()
};
kickq.create('job name', data, opts, function(err, id, promise) {
  // err = is something went wrong
  // id = the id of the job that can be used to delete a job

  promise.then(fnOnJobComplete, fnOnJobFailed);
});
```

Or set a default tombstone flag per job type via config:

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
kickq.create('job name', data, opts, function(err, id) {
  err = is something went wrong
  id = the id of the job that can be used to delete a job
});
```

Or set a default retry flag per job type via config:

```js
var KickQ = require('kickq');

KickQ.config({
  jobFlags: {
    'job name': {
      retry: true,
      retryCount: 5
    }
  }
});
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

function processJob(jobName, data, cb) {
  cb('error'); // <-- error
  cb(); // <-- no error
}
```

## Delete a job
```js
k.delete(id);
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
