import signal
import threading
from parser.parser import Parser
from pathlib import Path
from typing import Any, Dict, List  # noqa:F401

import gevent  # type: ignore
import zerorpc  # type: ignore

from api.connection import APIConnection
from misc.rate_limiting import RateLimitTracker
from writer.write_to_excel import DataWriter


class BackendServer(APIConnection, DataWriter, Parser):
    def process_filing_set(
        self,
        filing_list: List[Dict[str, Any]],
        output_folder_path: str = "./output",
    ):
        # create the path if it doesn't exist
        Path(output_folder_path).mkdir(parents=True, exist_ok=True)
        spreadsheet_contents = self._load_main_spreadsheet(output_folder_path)
        parse_tasks = [
            gevent.spawn(self.parse_document, filing["documentAddress10k"])
            for filing in filing_list
        ]
        gevent.joinall(parse_tasks)
        parse_task_results = [task.value for task in parse_tasks]
        ner_tasks = [
            gevent.spawn(self._apply_named_entity_recognition, parsed_doc)
            for parsed_doc in parse_task_results
        ]
        gevent.joinall(ner_tasks)
        ner_task_results = [task.value for task in ner_tasks]

        for i in range(0, len(parse_task_results)):
            spreadsheet_contents = self.add_dataframe_row(
                spreadsheet_contents,
                filing_list[i],
                parse_task_results[i],
                ner_task_results[i],
            )
        # use openpyxl to rewrite to excel; needs tinkering
        spreadsheet_contents.to_excel(Path(output_folder_path, "summary.xlsx"))


BIND_ADDRESS = "tcp://127.0.0.1:55565"


def kill_signal_listener(srv: zerorpc.Server):
    while True:
        msg = input()
        if msg == "kill":
            srv.stop()


def main():
    rate_limiter = RateLimitTracker(5)
    api_instance = BackendServer(rate_limiter)
    server = zerorpc.Server(api_instance, heartbeat=3600)
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
    # input = [    {
    #    "entityName": "FORD MOTOR CO",
    #    "cikNumber": "CIK0000037996",
    #    "filingType": "10-K",
    #    "filingDate": "2022-02-04",
    #    "documentAddress10k": "https://sec.gov/Archives/edgar/data/37996/000003799622000013/f-20211231.htm",
    #    "extractInfo": False,
    #    "stateOfIncorporation": "DE",
    #    "ein": "380549190",
    #    "hqAddress": {
    #        "street1": "ONE AMERICAN ROAD",
    #        "street2": None,
    #        "city": "DEARBORN",
    #        "stateOrCountry": "MI",
    #        "zipCode": "48126",
    #        "stateOrCountryDescription": "MI"
    #    }
    # }]
    # rate_limiter = RateLimitTracker(5)
    # api_instance = BackendServer(rate_limiter)
    # api_instance.process_filing_set(input)
    main()
