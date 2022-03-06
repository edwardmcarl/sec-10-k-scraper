import signal
from pickle import ADDITEMS

import gevent
import zerorpc  # type: ignore

from api.connection import APIConnection

count = 0


class Counter:
    def increment(self) -> int:
        global count
        count = count + 1
        return count


BIND_ADDRESS = "tcp://127.0.0.1:55555"


def main():
    server = zerorpc.Server(APIConnection())
    server.bind(BIND_ADDRESS)
    gevent.signal_handler(signal.SIGTERM, server.stop)
    gevent.signal_handler(signal.SIGINT, server.stop)
    server.run()


if __name__ == "__main__":
    main()
