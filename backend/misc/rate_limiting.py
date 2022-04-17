from math import ceil

from gevent import spawn  # type: ignore
from gevent.lock import BoundedSemaphore  # type: ignore
from gevent.time import sleep  # type: ignore


class RateLimitTracker:
    def __init__(self, max_requests_per_second=10) -> None:
        """
        Abuses semaphores to act as a rate limiter on greenlets making api requests.
        We don't care about a 'critical section' being accessed exclusively
        by one greenlet; we just want an atomically incremented/decremented counter
        that we can block requests on.
        """
        self._release_interval_seconds = 1 / max_requests_per_second
        self._semaphore = BoundedSemaphore(ceil(max_requests_per_second / 2))
        spawn(self.periodic_release)

    def acquire(self):
        return self._semaphore.acquire()

    def periodic_release(self):
        """
        Automatically release the internal semaphore at most every (1 / max_requests)
        seconds, to a maximum value of max_requests.
        """
        while True:
            try:
                sleep(self._release_interval_seconds)
                self._semaphore.release()
            except ValueError:  # Thrown when release() is called on a full semaphore
                # It's fine if we release() while the semaphore is "full".
                # Just means we're not making requests at the moment.
                pass


class RateLimited:
    """
    Parent class for any classes performing rate-limited operations. Accepts a RateLimitTracker
    in the constructor, which will be referenced by any rate-limited methods of the child classes.
    """

    def __init__(self, limit_counter: RateLimitTracker) -> None:
        self._rate_flag = limit_counter

    pass

    def _block_on_rate_limit(self):
        return self._rate_flag.acquire()
