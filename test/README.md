kickq API
=====
Kick jobs out the door. Quickly.
A job queue for node.


## General API overview

### One time setup
```js
var KickQ = require('kickq');

KickQ.config({
  redis: config.redis
});
```

### Creating a Job

```js
var KickQ = require('kickq');

var kickq = new KickQueue();

var data = {some:'stuff'};

// this is delayed by x amount of time from scheduling time
var opts = {delay: 1000 };

// ...or singleton job data is croned
// repeated by cron format (https://github.com/ncb000gt/node-cron)
var opts = { cron: '* * * 10'};

kickq.create('job name', data, opts, function(err, key) {
  // err = is something went wrong
  // key = the key of the job that can be used to delete a job
});
```


#### Create a Tombstoning Job

```js

/**
 * Callback when the job complets
 * @param  {string} key The job unique key.
 */
function fnOnJobComplete(key) {

};

/**
 * Callback for when the job eventually fails or timeouts

 * @param  {string}  err The error message
 * @param  {boolean} hasTimeout Indicates if the job timed-out.
 */
function fnOnJobFailOrTimeout(err, hasTimeout) {

};


var opts = {
  tombstone: true,
  tombstoneTimeout: 10 // seconds, default set via kickQ.config()
};
kickq.create('job name', data, opts, function(err, key, promise) {
  // err = is something went wrong
  // key = the key of the job that can be used to delete a job

  promise.then(fnOnJobComplete, fnOnJobFailOrTimeout);
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


#### Create a Job With Retries

```js
var opts = {
  retry: true,
  retryCount: 5 // times, default for job set via kickQ.config()
};
kickq.create('job name', data, opts, function(err, key, promise) {
  err = is something went wrong
  key = the key of the job that can be used to delete a job

  promise.then(fnOnJobComplete, fnOnJobFailOrTimeout);
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


### Process job
```js
k.process(['job name'], optMaxJobsNum, function(jobName, data, cb) {
  cb('error'); // <-- error

  cb(); // <-- no error

});
```

### Delete a job
```js
k.delete(key);
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
