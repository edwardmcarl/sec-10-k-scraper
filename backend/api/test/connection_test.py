import os
import sys
import unittest
import warnings
from datetime import datetime, timedelta
from unittest.mock import patch
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

import gevent  # type: ignore

# Weird way to import a parent module in Python
folder_dir = os.path.dirname(os.path.realpath(__file__))
parent_dir = os.path.dirname(folder_dir)
grandparent_dir = os.path.dirname(parent_dir)
sys.path.append(parent_dir)
sys.path.append(grandparent_dir)
from connection import APIConnection, APIConnectionError  # type: ignore # noqa: E402

from misc.rate_limiting import RateLimitTracker  # type: ignore # noqa: E402


class TestAPIConnectionError(unittest.TestCase):
    def setUp(self):
        self.conn_err = APIConnectionError(
            APIConnectionError.CONNECTION_ERROR, originalError=URLError(reason=None)
        )
        self.serv_err = APIConnectionError(
            APIConnectionError.SERVER_ERROR,
            originalError=HTTPError(url=None, code=None, hdrs=None, msg=None, fp=None),
        )
        self.start_date_err = APIConnectionError(
            APIConnectionError.START_DATE_FORMAT_ERROR, "199423"
        )
        self.unexpected_err = APIConnectionError(
            APIConnectionError.UNEXPECTED_ERROR, originalError=Exception()
        )

    def test_message(self):
        self.assertEqual(
            APIConnectionError.CONNECTION_ERROR,
            self.conn_err.message,
            "Incorrect message property",
        )

    def test_type(self):
        self.assertEqual(
            APIConnectionError.URL_TYPE_ERROR,
            self.conn_err.type,
            "Incorrect error type property",
        )
        self.assertEqual(
            APIConnectionError.HTTP_TYPE_ERROR,
            self.serv_err.type,
            "Incorrect error type property",
        )
        self.assertEqual(
            APIConnectionError.NO_TYPE_ERROR,
            self.start_date_err.type,
            "Incorrect error type property",
        )
        self.assertEqual(
            APIConnectionError.UNEXPECTED_TYPE_ERROR,
            self.unexpected_err.type,
            "Incorrect error type property",
        )

    def test_values(self):
        self.assertTupleEqual(
            ("199423",), self.start_date_err.values, "Incorrect value property"
        )
        self.assertTupleEqual((), self.conn_err.values, "Incorrect value property")


class TestAPIConnection(unittest.TestCase):
    def setUp(self):
        try:
            with urlopen("https://www.example.com") as res:  # noqa: F841
                self._conn = True
        except URLError:
            self._conn = False
        self.rate_limiter = RateLimitTracker()
        self.api_conn = APIConnection()
        self.search_key_no_results = "xxxsdxsdcsdsfdsfdsdfsddf"
        self.search_key_results = "ford"
        self.fake_cik = "CIK0000000000"
        self.wrong_cik_format = "CIK203823E321"
        self.real_cik = "CIK0000037996"
        self.real_cik_lowercase = "cik0000037996"
        self.wrong_date_format = "20190917"
        self.wrong_start_date = "1993-01-01"
        self.wrong_end_date = "9999-12-31"
        self.start_date = "2010-07-07"
        self.end_date = "2020-02-05"
        self.no_forms = []
        self.forms = ["10-k"]
        self.unsupported_form = "40-33"
        self.wrong_form = "I-DO-NOT-EXIST"

    @patch("connection.urlopen")
    def test_no_internet_connection(self, mock_urlopen):
        mock_urlopen.side_effect = URLError(reason=None)
        with self.assertRaises(APIConnectionError) as cm:
            self.api_conn.search(self.search_key_results)
        exception = cm.exception
        self.assertEqual(APIConnectionError.CONNECTION_ERROR, exception.message)
        self.assertEqual(APIConnectionError.URL_TYPE_ERROR, exception.type)
        self.assertTupleEqual((), exception.values)

        with self.assertRaises(APIConnectionError) as cm:
            self.api_conn.search_form_info(self.real_cik)
        exception = cm.exception
        self.assertEqual(APIConnectionError.CONNECTION_ERROR, exception.message)
        self.assertEqual(APIConnectionError.URL_TYPE_ERROR, exception.type)
        self.assertTupleEqual((), exception.values)

    @patch("json.loads")
    def test_unexpected_error_decoding(self, mock_json):
        # Reason for warning supression: https://stackoverflow.com/a/55411485
        warnings.filterwarnings(
            action="ignore", message="unclosed", category=ResourceWarning
        )
        if not self._conn:
            self.skipTest(
                f"Network connection is needed for this test -> {self.test_unexpected_error_decoding.__name__}"
            )

        mock_json.side_effect = Exception()
        with self.assertRaises(APIConnectionError) as cm:
            self.api_conn.search(self.search_key_results)
        exception = cm.exception
        self.assertEqual(APIConnectionError.UNEXPECTED_ERROR, exception.message)
        self.assertEqual(APIConnectionError.UNEXPECTED_TYPE_ERROR, exception.type)
        self.assertTupleEqual((), exception.values)

        with self.assertRaises(APIConnectionError) as cm:
            self.api_conn.search_form_info(self.real_cik)
        exception = cm.exception
        self.assertEqual(APIConnectionError.UNEXPECTED_ERROR, exception.message)
        self.assertEqual(APIConnectionError.UNEXPECTED_TYPE_ERROR, exception.type)
        self.assertTupleEqual((), exception.values)

    @patch("gzip.decompress")
    def test_unexpected_error_decompressing(self, mock_gzip):
        # Reason for warning supression: https://stackoverflow.com/a/55411485
        warnings.filterwarnings(
            action="ignore", message="unclosed", category=ResourceWarning
        )
        if not self._conn:
            self.skipTest(
                f"Network connection is needed for this test -> {self.test_unexpected_error_decompressing.__name__}"
            )

        mock_gzip.side_effect = Exception()
        with self.assertRaises(APIConnectionError) as cm:
            self.api_conn.search_form_info(self.real_cik)
        exception = cm.exception
        self.assertEqual(APIConnectionError.UNEXPECTED_ERROR, exception.message)
        self.assertEqual(APIConnectionError.UNEXPECTED_TYPE_ERROR, exception.type)
        self.assertTupleEqual((), exception.values)

    def test_search_empty_key(self):
        with self.assertRaises(APIConnectionError) as cm:
            self.api_conn.search("")
        exception = cm.exception
        self.assertEqual(APIConnectionError.SEARCH_KEY_ERROR, exception.message)
        self.assertEqual(APIConnectionError.NO_TYPE_ERROR, exception.type)
        self.assertTupleEqual((), exception.values)

    def test_search_non_empty_key_retrieves_no_result(self):
        # Reason for warning supression: https://stackoverflow.com/a/55411485
        warnings.filterwarnings(
            action="ignore", message="unclosed", category=ResourceWarning
        )
        if not self._conn:
            self.skipTest(
                f"Network connection is needed for this test -> {self.test_search_non_empty_key_retrieves_no_result.__name__}"
            )
        self.assertListEqual([], self.api_conn.search(self.search_key_no_results))

    def test_search_non_empty_key_retrieves_result(self):
        # Reason for warning supression: https://stackoverflow.com/a/55411485
        warnings.filterwarnings(
            action="ignore", message="unclosed", category=ResourceWarning
        )
        if not self._conn:
            self.skipTest(
                f"Network connection is needed for this test -> {self.test_search_non_empty_key_retrieves_result.__name__}"
            )
        results = self.api_conn.search(self.search_key_results)
        self.assertTrue(len(results) != 0)

    def test_wrong_cik_number_format(self):
        with self.assertRaises(APIConnectionError) as cm:
            self.api_conn.search_form_info(self.wrong_cik_format)
        exception = cm.exception
        self.assertEqual(APIConnectionError.CIK_INPUT_ERROR, exception.message)
        self.assertEqual(APIConnectionError.NO_TYPE_ERROR, exception.type)
        self.assertTupleEqual((self.wrong_cik_format,), exception.values)

    def test_correct_cik_number_format_but_fake_cik(self):
        if not self._conn:
            self.skipTest(
                f"Network connection is needed for this test -> {self.test_correct_cik_number_format_but_fake_cik.__name__}"
            )
        with self.assertRaises(APIConnectionError) as cm:
            self.api_conn.search_form_info(self.fake_cik)
        exception = cm.exception
        self.assertEqual(APIConnectionError.NO_CIK_EXISTS_ERROR, exception.message)
        self.assertEqual(APIConnectionError.HTTP_TYPE_ERROR, exception.type)
        self.assertTupleEqual((self.fake_cik.upper(),), exception.values)

    def test_wrong_date_input_format(self):
        with self.assertRaises(APIConnectionError) as cm:
            self.api_conn.search_form_info(
                self.real_cik, start_date=self.wrong_date_format
            )
        exception = cm.exception
        self.assertEqual(APIConnectionError.START_DATE_FORMAT_ERROR, exception.message)
        self.assertEqual(APIConnectionError.NO_TYPE_ERROR, exception.type)
        self.assertTupleEqual((self.wrong_date_format,), exception.values)

        with self.assertRaises(APIConnectionError) as cm:
            self.api_conn.search_form_info(
                self.real_cik, end_date=self.wrong_date_format
            )
        exception = cm.exception
        self.assertEqual(APIConnectionError.END_DATE_FORMAT_ERROR, exception.message)
        self.assertEqual(APIConnectionError.NO_TYPE_ERROR, exception.type)
        self.assertTupleEqual((self.wrong_date_format,), exception.values)

    def test_wrong_date_inputs(self):
        with self.assertRaises(APIConnectionError) as cm:
            self.api_conn.search_form_info(
                self.real_cik, start_date=self.wrong_start_date
            )
        exception = cm.exception
        self.assertEqual(APIConnectionError.START_DATE_INPUT_ERROR, exception.message)
        self.assertEqual(APIConnectionError.NO_TYPE_ERROR, exception.type)
        self.assertTupleEqual((self.wrong_start_date,), exception.values)

        with self.assertRaises(APIConnectionError) as cm:
            self.api_conn.search_form_info(self.real_cik, end_date=self.wrong_end_date)
        exception = cm.exception
        self.assertEqual(APIConnectionError.END_DATE_INPUT_ERROR, exception.message)
        self.assertEqual(APIConnectionError.NO_TYPE_ERROR, exception.type)
        self.assertTupleEqual((self.wrong_end_date,), exception.values)

        with self.assertRaises(APIConnectionError) as cm:
            self.api_conn.search_form_info(
                self.real_cik, start_date=self.end_date, end_date=self.start_date
            )
        exception = cm.exception
        self.assertEqual(APIConnectionError.DATE_INPUT_ERROR, exception.message)
        self.assertEqual(APIConnectionError.NO_TYPE_ERROR, exception.type)
        self.assertTupleEqual(
            (
                self.end_date,
                self.start_date,
            ),
            exception.values,
        )

    def test_no_forms_input(self):
        self.assertEqual(None, self.api_conn.search_form_info(self.real_cik, forms=[]))

    def test_wrong_or_unsupported_forms_input(self):
        with self.assertRaises(APIConnectionError) as cm:
            self.api_conn.search_form_info(
                self.real_cik, forms=[self.wrong_form, "10-K"]
            )
        exception = cm.exception
        self.assertEqual(APIConnectionError.FORM_KIND_ERROR, exception.message)
        self.assertEqual(APIConnectionError.NO_TYPE_ERROR, exception.type)
        self.assertTupleEqual((self.wrong_form,), exception.values)

        with self.assertRaises(APIConnectionError) as cm:
            self.api_conn.search_form_info(
                self.real_cik, forms=[self.unsupported_form, "10-K"]
            )
        exception = cm.exception
        self.assertEqual(APIConnectionError.FORM_KIND_ERROR, exception.message)
        self.assertEqual(APIConnectionError.NO_TYPE_ERROR, exception.type)
        self.assertTupleEqual((self.unsupported_form,), exception.values)

    def test_legit_request(self):
        # Reason for warning supression: https://stackoverflow.com/a/55411485
        warnings.filterwarnings(
            action="ignore", message="unclosed", category=ResourceWarning
        )
        if not self._conn:
            self.skipTest(
                f"Network connection is needed for this test -> {self.test_legit_request.__name__}"
            )

        results = self.api_conn.search_form_info(self.real_cik)

        self.assertTrue(len(results) != 0)
        keys = [
            "cik",
            "issuing_entity",
            "state_of_incorporation",
            "ein",
            "address",
            "filings",
            "forms",
        ]
        for key in keys:
            self.assertTrue(key in results, f"Missing key: {key}")

        for key in results:
            self.assertTrue(key in keys, f"Unexpected key: {key}")

        self.assertEqual(self.real_cik, results["cik"])
        self.assertListEqual(["10-K"], results["forms"])
        address_obj = results["address"]
        keys = ["mailing", "business"]
        for key in keys:
            self.assertTrue(key in address_obj, f"Missing key: {key}")

        keys = [
            "street1",
            "street2",
            "city",
            "stateOrCountry",
            "zipCode",
            "stateOrCountryDescription",
        ]
        for key in keys:
            self.assertTrue(key in address_obj["mailing"])
            self.assertTrue(key in address_obj["business"])

        for key in address_obj["mailing"]:
            self.assertTrue(key in keys, f"Unexpected key: {key}")

        for key in address_obj["business"]:
            self.assertTrue(key in keys, f"Unexpected key: {key}")

        filing_obj = results["filings"][0]
        keys = [
            "reportDate",
            "filingDate",
            "document",
            "form",
            "isXBRL",
            "isInlineXBRL",
        ]
        for key in keys:
            self.assertTrue(key in filing_obj, f"Missing key: {key}")

        for key in filing_obj:
            self.assertTrue(key in keys, f"Unexpected key: {key}")

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
