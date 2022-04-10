import os
import sys
import unittest
from datetime import datetime, timedelta

import gevent  # type: ignore

# Weird way to import a parent module in Python
folder_dir = os.path.dirname(os.path.realpath(__file__))
parent_dir = os.path.dirname(folder_dir)
sys.path.append(parent_dir)

from rate_limiting import RateLimitTracker  # type: ignore # noqa: E402


class TestAPIConnection(unittest.TestCase):
    def setUp(self):
        self.rate_limiter = RateLimitTracker()

    def test_rate_limiting_without_network(self):
        def acquisition_time():
            self.rate_limiter.acquire()
            return datetime.now()

        tasks = [gevent.spawn(acquisition_time) for i in range(25)]
        gevent.joinall(tasks, timeout=5)
        times = [task.value for task in tasks]
        self.assertEqual(len(times), 25)  # assert that all tasks finished
        times.sort()
        # Assert that there were >~1.5 seconds between first and last task completion.
        # The first ten requests will be fired off immediately, to jump to the 10 requests/second,
        # followed by ~1 request / 0.1 seconds.
        time_difference = times[24] - times[0]  # a timedelta object
        self.assertTrue(timedelta(seconds=1.4) < time_difference)


if __name__ == "__main__":
    unittest.main()
