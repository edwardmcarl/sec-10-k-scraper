import signal
import threading
from pickle import ADDITEMS  # noqa:F401

import gevent  # type: ignore
import zerorpc  # type: ignore

from api.connection import APIConnection

count = 0

BIND_ADDRESS = "tcp://127.0.0.1:55555"


def kill_signal_listener(srv: zerorpc.Server):
    while True:
        msg = input()
        if msg == "kill":
            srv.stop()


def main():

    api_instance = APIConnection()
    server = zerorpc.Server(api_instance)
    server.bind(BIND_ADDRESS)

    # new thread - listens in on stdin()
    kill_signal_thread = threading.Thread(target=kill_signal_listener, args=[server])
    kill_signal_thread.daemon = True
    kill_signal_thread.start()

    # handle kill signals on mac/linux (e.g. ctrl-c)
    gevent.signal_handler(signal.SIGTERM, server.stop)
    gevent.signal_handler(signal.SIGINT, server.stop)

    server.run()


if __name__ == "__main__":
    main()
