kickq
=====
Kick jobs out the door. Quickly.
A job queue that doesn't suck.


var KickQ = require('kickq');

var k = new KickQueue(config.redis);

var data = {some:'stuff'};

this is delayed by x amount of time from scheduling time

opts = {delay: 1000 };

singleton job data is croned, repeated by cron format (https://github.com/ncb000gt/node-cron)

opts = { cron: '* * * 10'};

// Creates job

<code>

k.create('job name', data, opts, function(err, key) {

  err is something went wrong
  
  key is the key of the job that can be used to delete a job
  
});

</code>

// Process job

<code>
k.process(['job name'], function(jobName, data, cb) {

  cb('error'); <-- error
  cb(); <-- no error
});
</code>

// Deletes a job
<code>
k.delete(key);
</code>

Kue sucks because:
* They put all their focus on stupid UI
* They leave old jobs hanging
* It's buggy
* There is no cron functionality


Nice to have:
* Retry
* Tombstoning
