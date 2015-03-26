# kickq

Kick Jobs out the door, quickly!

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

## Authors

* [@thanpolas][thanpolas]

## Release History

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
Copyright 2012 Verbling (Fluency Forums Corporation)

Licensed under the [MIT License](LICENSE-MIT)

[grunt]: http://gruntjs.com/
[Getting Started]: https://github.com/gruntjs/grunt/wiki/Getting-started
[Gruntfile]: https://github.com/gruntjs/grunt/wiki/Sample-Gruntfile "Grunt's Gruntfile.js"
[grunt-replace]: https://github.com/erickrdch/grunt-string-replace "Grunt string replace"
[grunt-S3]: https://github.com/pifantastic/grunt-s3 "grunt-s3 task"
[thanpolas]: https://github.com/thanpolas "Thanasis Polychronakis"
