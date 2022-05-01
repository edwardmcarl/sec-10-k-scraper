import signal
import sys
import threading
from enum import Enum
from pathlib import Path
from traceback import format_exception
from typing import Any, Dict, List  # noqa:F401

import gevent  # type: ignore
import zerorpc  # type: ignore
from zmq import ZMQError  # type: ignore

from api.connection import APIConnection
from misc.rate_limiting import RateLimitTracker
from parse.parse import Parse
from writer.write_to_excel import DataWriter


killServer = False # Will be mutated unsafely by a kill-listener thread; doesn't result in race conditions
class JobState(str, Enum):
    NO_WORK = "No Work"
    WORKING = "Working"
    COMPLETE = "Complete"
    ERROR = "Error"


class BackendServer(APIConnection, DataWriter, Parse):
    def __init__(self, limit_counter: RateLimitTracker) -> None:
        super().__init__(limit_counter)
        self.processing_state = JobState.NO_WORK
        self.processing_error = None

    def _set_job_state(self, state: JobState, err=None):
        self.processing_state = state
        self.processing_error = err

    def _rate_limited_html_download(self, url: str, dest_folder: Path, filename: str):
        dest_folder.mkdir(parents=True, exist_ok=True)
        dest_path = Path(dest_folder, filename)
        data = self._get_html_data(url)
        with open(dest_path.resolve(), mode="w") as file:
            file.write(data)

    def get_job_state(self):
        return {"state": self.processing_state, "error": self.processing_error}

    def process_filing_set(
        self,
        filing_list: List[Dict[str, Any]],
        output_folder_path: str,
        perform_ner: bool = True,
    ):
        # set state to indicate we're working
        if self.processing_state == JobState.WORKING:
            return False
        self.processing_state = JobState.WORKING
        gevent.spawn(
            self._process_filings, filing_list, output_folder_path, perform_ner
        )
        return True

    def _process_filings(
        self,
        filing_list: List[Dict[str, Any]],
        output_folder_path: str = "./output",
        perform_ner: bool = True,
    ):
        try:
            # create the path / output folder if it doesn't exist
            Path(output_folder_path).mkdir(parents=True, exist_ok=True)
            spreadsheet_contents = self._load_main_spreadsheet(output_folder_path)

            # download html files
            download_tasks = [
                gevent.spawn(
                    self._rate_limited_html_download,
                    filing["documentAddress10k"],
                    Path(output_folder_path, filing["entityName"]),
                    f"{filing['filingType']}_{filing['filingDate']}.htm",
                )
                for filing in filing_list
            ]
            gevent.joinall(download_tasks)

            # Only 10-Ks should be parsed and added to the spreadsheet
            filing_list_10k = [
                filing
                for filing in filing_list
                if filing["filingType"].lower() == "10-K".lower()
            ]

            # parse html iteratively, to maximize number of event loop yields with gevent
            parse_task_results = [
                self.parse_document(filing["documentAddress10k"])
                for filing in filing_list_10k
            ]

            # apply NER iteratively, to maximize number of event loop yields with gevent
            ner_task_results = [
                self._apply_named_entity_recognition(parsed_doc)
                if perform_ner
                else {}  # if we don't run NER, behave as if no entities were recognized
                for parsed_doc in parse_task_results
            ]

            # iteratively expand spreadsheet
            for i in range(0, len(parse_task_results)):
                spreadsheet_contents = self.add_dataframe_row(
                    spreadsheet_contents,
                    filing_list_10k[i],
                    parse_task_results[i],
                    ner_task_results[i],
                )

            # use openpyxl to rewrite to excel; needs tinkering
            spreadsheet_contents.to_excel(
                Path(output_folder_path, "summary.xlsx"), index=False
            )
            self._set_job_state(JobState.COMPLETE)
        except Exception as err:
            error_report = "\n".join(format_exception(err))  # type: ignore
            self._set_job_state(JobState.ERROR, error_report)


BIND_ADDRESS = "tcp://127.0.0.1:55565"


def kill_signal_listener(srv: zerorpc.Server):
    global killServer
    while True:
        msg = input()
        if msg == "kill":
            killServer = True


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


def foo():
    rate_limiter = RateLimitTracker(5)
    api_instance = BackendServer(rate_limiter)
    api_instance._rate_limited_html_download(
        "https://www.sec.gov/Archives/edgar/data/0000037996/000003799621000012/f-20201231.htm",
        Path("/home", "edcarl", "Desktop"),
        "EXXON_421-2934.html",
    )

def exit_gracefully(srv: zerorpc.Server):
    while True:
        if killServer:
            srv.stop()
            gevent.sleep(1)
            srv.close()
            sys.exit()
        gevent.sleep(1)
def main():
    rate_limiter = RateLimitTracker(5)
    api_instance = BackendServer(rate_limiter)
    server = zerorpc.Server(api_instance, heartbeat=15)

    # find a port that's not being used
    selected_port = bind_to_unused_port(server, 55555)
    # communicate the selected port to the frontend via stdout
    print(selected_port)

    # new thread - listens in on stdin()
    kill_signal_thread = threading.Thread(target=kill_signal_listener, args=[server])
    kill_signal_thread.daemon = True
    kill_signal_thread.start()
    
    # new greenlet - checks killSignal and stops the event loop (and therefore the main thread) if it's  true
    gevent.spawn(exit_gracefully, server)


    server.run()


if __name__ == "__main__":
    main()
