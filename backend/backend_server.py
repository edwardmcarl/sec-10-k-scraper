import signal
import threading
from pickle import ADDITEMS  # noqa:F401

import gevent  # type: ignore
import zerorpc
from zmq import ZMQError  # type: ignore

from api.connection import APIConnection

count = 0

BIND_ADDRESS = "tcp://127.0.0.1:55555"


def kill_signal_listener(srv: zerorpc.Server):
    while True:
        msg = input()
        if msg == "kill":
            srv.stop()


def bind_to_unused_port(srv: zerorpc.Server, port: int = 55555):
    server_bound = False
    while not server_bound:
        try:
            srv.bind(f"tcp://127.0.0.1:{port}")
            server_bound = True
        except ZMQError as e:
            port = port + 1
            if (
                port > 65535
            ):  # if we've exhausted all ports above 55555, something weird is going on
                raise e
    return port


def main():

    api_instance = APIConnection()
    server = zerorpc.Server(api_instance)
    # find a port that's not being used
    selected_port = bind_to_unused_port(server, 55565)
    # communicate the selected port to the frontend
    print(selected_port)
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
