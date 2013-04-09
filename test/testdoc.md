# TOC
   - [Job Creation](#job-creation)
     - [1.1 A "plain job"](#job-creation-11-a-plain-job)
     - [1.2 A "plain job" with Object Data](#job-creation-12-a-plain-job-with-object-data)
     - [1.3 A "delayed job"](#job-creation-13-a-delayed-job)
     - [1.4 A "hotjob job"](#job-creation-14-a-hotjob-job)
       - [Timeout tests](#job-creation-14-a-hotjob-job-timeout-tests)
     - [1.5 A Job With Retries](#job-creation-15-a-job-with-retries)
     - [1.6 Job Creation returns a Promise](#job-creation-16-job-creation-returns-a-promise)
   - [0.0 API scaffolding](#00-api-scaffolding)
   - [2.0 Job Processing](#20-job-processing)
<a name=""></a>
 
<a name="job-creation"></a>
# Job Creation
<a name="job-creation-11-a-plain-job"></a>
## 1.1 A "plain job"
1.1.1 Create a "plain job".

```js
// use the promised pattern so errors are visible
assert.isFulfilled( kickq.create( tester.fix.jobname, 'data', {},
  function(err, job) {
    assert.isNull(err, 'The "err" arg should be null');
    done();
  }),
  'hotjob promise should resolve');
```

1.1.2 Verify "plain job" was created.

```js
kickq.create( 'create-verify', 'data', {}, function(err) {
  kickq.process('create-verify', function(job, data, cb) {
    cb();
    done();
  });
});
```

1.1.3 Create a "plain job" with no callback.

```js
kickq.create('create-no-callback', 'data', {});
kickq.process('create-no-callback', function(job, data, cb) {
  cb();
  done();
});
```

1.1.4 Create a "plain job" with no options.

```js
kickq.create('create-no-options', 'data', function(err, key) {
  kickq.process('create-no-options', function(job, data, cb) {
    cb();
    done();
  });
});
```

1.1.5 Create a "plain job" with no data and no options.

```js
kickq.create('create-no-data', function(err, key) {
  kickq.process('create-no-data', function(job, data, cb) {
    cb();
    done();
  });
});
```

1.1.6 Create a "plain job" with only the name.

```js
kickq.create('create-only-name');
setTimeout(kickq.process('create-only-name', function(job, data, cb) {
  cb();
  done();
}), 300);
```

1.1.7 Create a "plain job" and check the returned Job instance.

```js
kickq.create('create-only-name');
setTimeout(kickq.process('create-only-name', function(job, data, cb) {
  jobTest.testInstanceProps(job);
  assert.equal(job.state, 'new', 'state of the job should be "new"' );
  done();
}), 300);
```

<a name="job-creation-12-a-plain-job-with-object-data"></a>
## 1.2 A "plain job" with Object Data
Verify "plain job" with Object Data was created.

```js
kickq.create('create-data-object', tester.fix.plain.data, function(){
  kickq.process('create-data-object', function(job, data, cb) {
    assert.deepEqual(data, tester.fix.plain.data, 'data provided should deep equal value passed');
    assert.equal(job.name, 'create-data-object', 'job name provided should equal value passed');
    cb();
    done();
  });
});
```

<a name="job-creation-14-a-hotjob-job"></a>
## 1.4 A "hotjob job"
1.4.0 create callback returns a promise to use for hotjobs.

```js
function onJobCreate(err, job, promise) {
        assert.ok( when.isPromise(promise), 'create callback should yield' +
        ' a promise in the callback');

        done();
      }

      kickq.create('hotjob_job 1.4.0', 'hotjob job promise check', opts, onJobCreate);
```

1.4.1 Create a "hotjob job".

```js
function onJobCreate(err, job, promise) {
        assert.isFulfilled(promise, 'hotjob promise should resolve').notify(done);
        promise.then(function(){
        });
        kickq.process('hotjob_job 1.4.1', function(job, data, cb) {
          cb();
        });
      }

      kickq.create('hotjob_job 1.4.1', 'hotjob job data 1.4.1', opts, onJobCreate);
```

1.4.2 Create a "hotjob job" and test the promise response object.

```js
function onJobCreate(err, job, promise) {
        assert.ok( when.isPromise(promise), 'create callback should yield' +
        ' a promise in the callback');
        assert.isFulfilled(promise.then(function(job) {
          assert.ok(job.complete, '"complete" property should be true');
          assert.equal(job.name, 'hotjob_job 1.4.2', '"jobName" property should have proper value');
        }), 'hotjob promise should resolve').notify(done);

        kickq.process('hotjob_job 1.4.2', function(job, data, cb) {
          cb();
        });

      }

      kickq.create('hotjob_job 1.4.2', 'hotjob job data 1.4.2', opts, onJobCreate);
```

1.4.3 Create a "hotjob job" that will fail.

```js
function onJobCreate(err, job, promise) {
        var testprom = assert.isRejected(promise,
          'hotjob Promise should be rejected').notify(done);

        kickq.process('hotjob_job 1.4.3', function(job, data, cb) {
          cb('error message');
        });
      }

      kickq.create('hotjob_job 1.4.3', 'hotjob job data', opts, onJobCreate);
```

<a name="job-creation-14-a-hotjob-job-timeout-tests"></a>
### Timeout tests
1.4.4 Create a "hotjob job" that will timeout using default timeout value.

```js
var startTime;

// go back to natural timeout until sinon.useFakeTimers + travis resolves
// https://github.com/cjohansen/Sinon.JS/issues/268
// this.timeout(11000);

function onJobCreate(err, job, promise) {
  startTime = new Date().getTime();

  assert.isFulfilled( promise.then(
    noop, function( err ) {
      var endTime = new Date().getTime();

      assert.ok( (endTime - startTime) > 9000, 'Promise should timeout' +
        ' at least after 9000ms');
    }),
    'hotjob Promise should be fulfilled'
  )
  .notify(done);

  clock.tick(10100);
  // clock.restore();
}

kickq.create('hotjob_job 1.4.4', 'hotjob job data', opts, onJobCreate);
```

1.4.5 Create a "hotjob job" that will timeout using custom timeout value.

```js
var startTime;
// go back to natural timeout until sinon.useFakeTimers + travis resolves
// https://github.com/cjohansen/Sinon.JS/issues/268
// this.timeout(5000);

var opts = {
  hotjob: true,
  hotjobTimeout: 4
};
function onJobCreate(err, id, promise) {
  startTime = new Date().getTime();

  assert.isFulfilled( promise.then(
    noop, function( err ) {
      var endTime = new Date().getTime();
      assert.ok( (endTime - startTime) > 3000, 'Promise should timeout' +
      ' at least after 3000ms');
    }),
    'hotjob Promise should be fulfilled'
  )
  .notify(done);

  clock.tick(4100);
  // clock.restore();
}
kickq.create('hotjob_job 1.4.5', 'hotjob job data', opts, onJobCreate);
```

<a name="job-creation-16-job-creation-returns-a-promise"></a>
## 1.6 Job Creation returns a Promise
1.6.1 Job Creation returns a promise.

```js
var createPromise = kickq.create('create-promise-test');
assert.ok(when.isPromise(createPromise), 'create job should return a promise');
```

1.6.2 Job creation promise resolves.

```js
var createPromise = kickq.create('create-promise-arguments');
assert.isFulfilled(createPromise, 'job create promise should resolve').notify(done);
```

1.6.3 Job creation promise resolves with proper arguments.

```js
var createPromise = kickq.create('create-promise-arguments');
assert.isFulfilled(createPromise.then(function(job) {
  jobTest.testInstanceProps(job);
  assert.equal(job.name, 'create-promise-arguments', '"job.name" ' +
    'property should have proper value');
}), 'job create promise should resolve').notify(done);
```

1.6.4 hotjob creation.

```js
var opts = {hotjob:true};
var createPromise = kickq.create('create-promise-arguments', 'data', opts);

assert.isFulfilled(createPromise.then(function(job) {
  assert.ok(job.hotjob, 'job.hotjob flag should be true in job instance');
  assert.ok(when.isPromise(job.hotjobPromise), 'job.hotjobPromise should be a promise');
}), 'job create promise should resolve').notify(done);
```

<a name="00-api-scaffolding"></a>
# 0.0 API scaffolding
0.0.1 Static Functions.

```js
assert.isFunction(kickq.config, 'should have a "config" function');
assert.isFunction(kickq.reset, 'should have a "reset" function');
assert.isFunction(kickq.create, 'should have the "create" function');
assert.isFunction(kickq.process, 'should have the "process" function');
assert.isFunction(kickq.delete, 'should have the "delete" function');
```

<a name="20-job-processing"></a>
# 2.0 Job Processing
2.0.1 The job instance argument.

```js
var jobid;

kickq.create('process-test-one', 'data', {}, function(err, key) {
  jobid = key;
});
kickq.process('process-test-one', function(job, data, cb) {
  jobTest.testIntanceProps(job);
  assert.equal(jobid, job.id, 'The job id should be the same');
  assert.equal(job.name, 'process-test-one', 'The job name should be the same');
  assert.equal(job.state, 'processing', 'State should be "processing"');
  assert.equal(job.runs.length, 1, 'there should be one process item');

  var processItem = job.runs[0];
  jobTest.testProcessItem(processItem);
  assert.equal(processItem.count, 1, 'The process count should be 1 (the first)');
  assert.equal(processItem.state, 'processing', 'The process item should be "processing"');

  cb();
  done();
});
```

2.0.2 Concurrent jobs.

```js
// allow some time to execute
this.timeout(5000);

// create 20 jobs
var jobPromises = [];
for (var i = 0; i < 20; i++) {
  jobPromises.push(kickq.create('process-test-Concurrent'));
}

var jobProcessCount = 0;
var jobProcessQueue = [];
function startProcess() {
  var opts = {concurrentJobs: 10};
  kickq.process('process-test-Concurrent', opts, function(jobObj, data, cb) {
    jobProcessCount++;

  });
  // allow for all to-process jobs to be collected
  setTimeout(function(){
    assert.equal(jobProcessCount, 10, '10 jobs should be queued for processing');
    done();
  }, 3000);
}

when.all(jobPromises).then(startProcess);
```

