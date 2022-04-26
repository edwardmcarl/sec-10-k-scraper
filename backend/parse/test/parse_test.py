import os
import sys
import unittest
import warnings
from unittest.mock import patch
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

# Weird way to import a parent module in Python
folder_dir = os.path.dirname(os.path.realpath(__file__))
parent_dir = os.path.dirname(folder_dir)
grandparent_dir = os.path.dirname(parent_dir)
sys.path.append(parent_dir)
sys.path.append(grandparent_dir)
from misc.rate_limiting import RateLimitTracker  # type: ignore # noqa: E402
from parse import Parse, ParseError  # type: ignore # noqa: E40


class TestParseError(unittest.TestCase):
    def setUp(self):
        self.conn_err = ParseError(
            ParseError.CONNECTION_ERROR, originalError=URLError(reason=None)
        )
        self.serv_err = ParseError(
            ParseError.SERVER_ERROR,
            originalError=HTTPError(url=None, code=None, hdrs=None, msg=None, fp=None),
        )
        self.no_file_exits_err = ParseError(ParseError.NO_FILE_EXISTS_ERROR, "404.htm")
        self.unexpected_err = ParseError(
            ParseError.UNEXPECTED_ERROR, originalError=Exception()
        )

    def test_message(self):
        self.assertEqual(
            ParseError.CONNECTION_ERROR,
            self.conn_err.message,
            "Incorrect message property",
        )

    def test_values(self):
        self.assertTupleEqual(
            ("404.htm",), self.no_file_exits_err.values, "Incorrect value property"
        )
        self.assertTupleEqual((), self.conn_err.values, "Incorrect value property")

    def test_original_error(self):
        self.assertEqual(None, self.no_file_exits_err.originalError, None)
        self.assertTrue(isinstance(self.serv_err.originalError, HTTPError))


class TestParse(unittest.TestCase):
    def setUp(self):
        try:
            with urlopen("https://www.example.com") as res:  # noqa: F841
                self._conn = True
        except URLError:
            self._conn = False
        self.rate_limiter = RateLimitTracker()
        self.parser = Parse(self.rate_limiter)
        self.document_url = "https://www.sec.gov/Archives/edgar/data/0000037996/000003799621000012/f-20201231.htm"  # 2020 10-K document for Ford
        self.wrong_document_url = "wrong_document.txt"

    @patch("parse.urlopen")
    def test_no_internet_connection(self, mock_urlopen):
        mock_urlopen.side_effect = URLError(reason=None)
        with self.assertRaises(ParseError) as cm:
            self.parser.parse_document(self.document_url)
        exception = cm.exception
        self.assertEqual(ParseError.CONNECTION_ERROR, exception.message)
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
        with self.assertRaises(ParseError) as cm:
            self.parser.parse_document(self.document_url)
        exception = cm.exception
        self.assertEqual(ParseError.UNEXPECTED_ERROR, exception.message)
        self.assertTupleEqual((), exception.values)

    @patch("parse.urlopen")
    def test_no_file_exists(self, mock_urlopen):
        mock_urlopen.side_effect = HTTPError(
            url=None, code=404, hdrs=None, msg=None, fp=None
        )
        with self.assertRaises(ParseError) as cm:
            self.parser.parse_document(self.document_url)
        exception = cm.exception
        self.assertEqual(ParseError.NO_FILE_EXISTS_ERROR, exception.message)
        self.assertTupleEqual((self.document_url,), exception.values)

    def test_document_not_supported(self):
        with self.assertRaises(ParseError) as cm:
            self.parser.parse_document(self.wrong_document_url)
        exception = cm.exception
        self.assertEqual(ParseError.DOCUMENT_NOT_SUPPORTED, exception.message)
        self.assertTupleEqual((self.wrong_document_url,), exception.values)

    def test_legit_call(self):
        # We expect all fields to be present in this extraction
        output = self.parser.parse_document(self.document_url)
        for key in output:
            self.assertTrue(key in Parse.EXTRACTED_FIELDS)

        for key in Parse.EXTRACTED_FIELDS:
            self.assertTrue(key in list(output))


if __name__ == "__main__":
    unittest.main()
