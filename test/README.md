kickq API
=====
Kick jobs out the door. Quickly.
A job queue for node.

```js
var KickQ = require('kickq');

var k = new KickQueue(config.redis);

var data = {some:'stuff'};

this is delayed by x amount of time from scheduling time

opts = {delay: 1000 };

singleton job data is croned, repeated by cron format (https://github.com/ncb000gt/node-cron)

opts = { cron: '* * * 10'};
```

## Create a Job
```js
k.create('job name', data, opts, function(err, key) {

  err = is something went wrong

  key = the key of the job that can be used to delete a job

});
```

## Process job
```js
k.process(['job name'], function(jobName, data, cb) {
  cb('error'); <-- error

  cb(); <-- no error

});
```

## Delete a job
```js
k.delete(key);
```

Kue won't do because:
* They put all their focus on UI vs functionality
* They leave old jobs hanging
* It's buggy
* There is no cron functionality
* It is no longer maintained


Nice to have:
* Retry
* Tombstoning
* Simple aggregation stats
