# Kickq

Kick Jobs out the door, quickly!

A Robust Node.js queueing service based on redis.

[![Build Status](https://travis-ci.org/verbling/kickq.png?branch=master)](https://travis-ci.org/verbling/kickq)

## Install

```shell
npm install kickq --save
```

## Documentation

The full documentation can be found in the [project's wiki](https://github.com/verbling/kickq/wiki).


## The Core API

* [Create Jobs](https://github.com/verbling/kickq/wiki/Create-Jobs)
* [Process Jobs](https://github.com/verbling/kickq/wiki/Process-Jobs)
* [Configure Kickq](https://github.com/verbling/kickq/wiki/Configure-Kickq)

## Utilities and Helpers

* [The Kickq Job Item](https://github.com/verbling/kickq/wiki/The-Kickq-Job-Item)
* [All Kickq Methods and Properties](https://github.com/verbling/kickq/wiki/All-Kickq-Methods and-Properties)
* [Kickq Metrics](https://github.com/verbling/kickq/wiki/Kickq-Metrics)

## Notes on v1.x.x Upgrade

On August 23rd 2015 Kickq got a major version bump from `v0.2.4` to `v1.0.0`. The whole of the Kickq codebase has been rehauled and updated using the latest libraries and patterns in Node.js, no API changes were made, Kickq should continue to operate as it was. A very small change has happened in a single processing object attribute which is insignificant and you probably didn't ever care about, id you did [read more about it in the wiki](https://github.com/verbling/kickq/wiki/Moving-from-0.x-to-1.x).

What changed:

### Moved to Bluebird Promises library

We've let go of when in favor of Bluebird. This is a major change in how Kickq operates as when Kickq was first built Promise libraries where not very performant so we used a specific version of When (1.8.1) which resolved promises Synchronously (vs asynchronously as the spec dictates). We've come a long way since then so the core Promise library change was long overdue.

More robust Promises patterns were applied throughout the codebase.

### Refactored Worker Controller

The Worker controller is the module responsible for fetching job from the queue and providing them to the consumer worker for processing. The whole system has been refactored and rehauled to be more robust and handle all outcomes (error or not) more diligently and specifically.

### Redis connectivity monitor

We've created a master Redis Connectivity monitor which is responsible for letting the rest of the system know of Redis Connectivity State and emit events when a change occurs, Redis goes down or comes up.

Thus Kickq will now handle Redis disconnects way more softly and patiently wait for the connection to be re-established.

### Logging

We've lowered the logging verbosity quite a bit and restructured the logs so they make more sense.

### General Styling

The whole of the codebase has been brought up to 2015 Node state in regards to styling.


## Authors

* [@thanpolas][thanpolas]

## Release History

- **v1.0.0**, *23 Aug 2015*
  - Major rehaul and refactoring of Kickq.
  - Changed core Promises Library from When to Bluebird.
  - Rewritten the Worker Controller which is responsible for fetching and providing the jobs to the consumer worker.
  - Introduced the master Redis Connectivity monitor, Kickq now handles disconnects way more gracefully, and will restore operations when Redis re-connection occures.
  - Reduced Logging verbosity and tweaked existing one to be more informant.
- **v0.2.4**, *30 Jun 2015*
  - Lightened up the npm install bundle using npmingore and better devdeps, thankyou [@lbeschastny](https://github.com/lbeschastny)
- **v0.2.3**, *16 Jun 2015*
  - Accept any truthy value as an error callback in job processing.
- **v0.2.2**, *22 Apr 2015*
  - Restore node-syslog package and test vs 0.12 in travis.
- **v0.2.1**, *04 Apr 2015*
  - Set the log level properly.
- **v0.2.0**, *26 Mar 2015*
  - Made Kickq compatible with node 0.12.0 and **incompatible** with node 0.8.0, thankyou [@lbeschastny](https://github.com/lbeschastny)
- **v0.1.0**, *17 Feb 2015*
  - Updated all dependencies to latest.
  - Adjusted unit tests.
  - Poke poke, is this on?
- **v0.0.16**, *03 May 2013*
  - Fixed back in `.get()` method, not invoking callback when no results.
  - Renamed `kickq.error` to `kickq.Error` for semantic correctness.
  - Cleaned up error objects.
- **v0.0.15**, *27 Apr 2013*
  - Now publishes on `kickq:delete` for all job ites that get deleted.
  - Delete now removes all traces of job item.
  - Bug fix when job failed and test case to avoid regression.
- **v0.0.14**, *27 Apr 2013*
  - Added time index.
  - Fixed state bug when job failed.
  - More debugging logs.
- **v0.0.13**, *26 Apr 2013*
  - Global Job Item configuration options were not applied to new job items, fixed.
  - Bug fixes on Job Item when processing timedout.
  - More test cases.
- **v0.0.12**, *26 Apr 2013*
  - Perform state record creation.
  - More logging for debugging purposes.
- **v0.0.10**, *26 Apr 2013*
  - Simplified logger level configuration.
  - More logging messages.
  - Lax stress tests margins.
- **v0.0.9**, *26 Apr 2013*
  - A mythical bug of epic proportions, redis client connected before config was set.
- **v0.0.7**, *24 Apr 2013*
  - Enabled purging of completed jobs.
  - More tests for job item.
  - More logging is performed when kickq fails.
- **v0.0.6**, *24 Apr 2013*
  - Fixed metrics stop bug.
  - Exposed more internal libs.
  - Auto-fetches ver info.
- **v0.0.5**, *23 Apr 2013*
  - Created the Metrics module.
  - Several bug fixes.
  - Exposed more internal parts for better plugin integration.
- **v0.0.4**, *18 Apr 2013*
  - Created Worker Guard that ensures worker's health.
  - kickq is now resilient to redis disconnections and errors.
  - Worker error throttler refactored.
  - Now saves to syslog instead of db.
- **v0.0.2**, *16 Apr 2013*
  - Added Logging facility.
  - Performance optimizations.
  - Implemented the `.get()` method for fetching job items.
- **v0.0.1**, *11 Apr 2013*
  - Big Bang

## License

Copyright 2016 Verbling (Fluency Forums Corporation)

Licensed under the [MIT License](LICENSE-MIT)

[grunt]: http://gruntjs.com/
[Getting Started]: https://github.com/gruntjs/grunt/wiki/Getting-started
[Gruntfile]: https://github.com/gruntjs/grunt/wiki/Sample-Gruntfile "Grunt's Gruntfile.js"
[grunt-replace]: https://github.com/erickrdch/grunt-string-replace "Grunt string replace"
[grunt-S3]: https://github.com/pifantastic/grunt-s3 "grunt-s3 task"
[thanpolas]: https://github.com/thanpolas "Thanasis Polychronakis"
