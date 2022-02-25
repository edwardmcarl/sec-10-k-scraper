import os
import sys
import warnings
import unittest
from urllib.error import HTTPError, URLError

# Weird way to import a parent module in Python
folder_dir = os.path.dirname(os.path.realpath(__file__))
parent_dir = os.path.dirname(folder_dir)
sys.path.append(parent_dir)
from connection import APIConnection, APIConnectionError

class TestAPIConnectionError(unittest.TestCase):
    def setUp(self):
        self.conn_err = APIConnectionError(APIConnectionError.CONNECTION_ERROR, originalError=URLError(reason=None))
        self.serv_err = APIConnectionError(APIConnectionError.SERVER_ERROR, originalError=HTTPError(url=None, code=None, hdrs=None, msg=None, fp=None))
        self.start_date_err = APIConnectionError(APIConnectionError.START_DATE_FORMAT_ERROR, '199423')
        self.unexpected_err = APIConnectionError(APIConnectionError.UNEXPECTED_ERROR, originalError=Exception())

    def test_message(self):
        self.assertEqual(APIConnectionError.CONNECTION_ERROR, self.conn_err.message, "Incorrect message property")
    
    def test_type(self):
        self.assertEqual(APIConnectionError.URL_TYPE_ERROR, self.conn_err.type, "Incorrect error type property")
        self.assertEqual(APIConnectionError.HTTP_TYPE_ERROR, self.serv_err.type, "Incorrect error type property")
        self.assertEqual(APIConnectionError.NO_TYPE_ERROR, self.start_date_err.type, "Incorrect error type property")
        self.assertEqual(APIConnectionError.UNEXPECTED_TYPE_ERROR, self.unexpected_err.type, "Incorrect error type property")
    
    def test_values(self):
        self.assertTupleEqual(('199423',), self.start_date_err.values, "Incorrect value property")
        self.assertTupleEqual((), self.conn_err.values, "Incorrect value property")

class TestAPIConnection(unittest.TestCase):
    def setUp(self):
        self.api_conn = APIConnection()
        self.search_key_no_results = 'xxxsdxsdcsdsfdsfdsdfsddf'
        self.search_key_results = 'ford'
        self.fake_cik = 'CIK0000000000'
        self.wrong_cik_format = 'CIK203823E321'
        self.real_cik = 'CIK0000037996'
        self.real_cik_lowercase = 'cik0000037996'
        self.wrong_date_format = '20190917'
        self.wrong_start_date = '1993-01-01'
        self.wrong_end_date = '9999-12-31'
        self.start_date = '2010-07-07'
        self.end_date = '2020-02-05'
        self.no_forms = []
        self.forms = ['10-k']

    def test_no_internet_connection(self):
        pass

    def test_search_empty_key(self):
        with self.assertRaises(APIConnectionError) as cm:
            self.api_conn.search('')
        exception = cm.exception
        self.assertEqual(APIConnectionError.SEARCH_KEY_ERROR, exception.message)
        self.assertEqual(APIConnectionError.NO_TYPE_ERROR, exception.type)
        self.assertTupleEqual((), exception.values)

    def test_non_empty_key_retrieves_no_result(self):
        self.assertListEqual([], self.api_conn.search(self.search_key_no_results))

    def test_non_empty_key_retrieves_result(self):
        results = self.api_conn.search(self.search_key_results)
        self.assertTrue(len(results) != 0)
        keys = ['cik', 'entity']
        for key in keys:
            self.assertTrue(key in results[0])

    def test_wrong_cik_number_format(self):
        with self.assertRaises(APIConnectionError) as cm:
            self.api_conn.search_form_info(self.wrong_cik_format)
        exception = cm.exception
        self.assertEqual(APIConnectionError.CIK_INPUT_ERROR, exception.message)
        self.assertEqual(APIConnectionError.NO_TYPE_ERROR, exception.type)
        self.assertTupleEqual((self.wrong_cik_format,), exception.values)

    def test_correct_cik_number_format_but_fake_cik(self):
        with self.assertRaises(APIConnectionError) as cm:
            self.api_conn.search_form_info(self.fake_cik)
        exception = cm.exception
        self.assertEqual(APIConnectionError.NO_CIK_EXISTS_ERROR, exception.message)
        self.assertEqual(APIConnectionError.HTTP_TYPE_ERROR, exception.type)
        self.assertTupleEqual((self.fake_cik.upper(),), exception.values)

    def test_wrong_date_input_format(self):
        with self.assertRaises(APIConnectionError) as cm:
            self.api_conn.search_form_info(self.real_cik, start_date = self.wrong_date_format)
        exception = cm.exception
        self.assertEqual(APIConnectionError.START_DATE_FORMAT_ERROR, exception.message)
        self.assertEqual(APIConnectionError.NO_TYPE_ERROR, exception.type)
        self.assertTupleEqual((self.wrong_date_format,), exception.values)

        with self.assertRaises(APIConnectionError) as cm:
            self.api_conn.search_form_info(self.real_cik, end_date = self.wrong_date_format)
        exception = cm.exception
        self.assertEqual(APIConnectionError.END_DATE_FORMAT_ERROR, exception.message)
        self.assertEqual(APIConnectionError.NO_TYPE_ERROR, exception.type)
        self.assertTupleEqual((self.wrong_date_format,), exception.values)

    def test_wrong_date_inputs(self):
        with self.assertRaises(APIConnectionError) as cm:
            self.api_conn.search_form_info(self.real_cik, start_date = self.wrong_start_date)
        exception = cm.exception
        self.assertEqual(APIConnectionError.START_DATE_INPUT_ERROR, exception.message)
        self.assertEqual(APIConnectionError.NO_TYPE_ERROR, exception.type)
        self.assertTupleEqual((self.wrong_start_date,), exception.values)

        with self.assertRaises(APIConnectionError) as cm:
            self.api_conn.search_form_info(self.real_cik, end_date = self.wrong_end_date)
        exception = cm.exception
        self.assertEqual(APIConnectionError.END_DATE_INPUT_ERROR, exception.message)
        self.assertEqual(APIConnectionError.NO_TYPE_ERROR, exception.type)
        self.assertTupleEqual((self.wrong_end_date,), exception.values)

        with self.assertRaises(APIConnectionError) as cm:
            self.api_conn.search_form_info(self.real_cik, start_date = self.end_date, end_date=self.start_date)
        exception = cm.exception
        self.assertEqual(APIConnectionError.DATE_INPUT_ERROR, exception.message)
        self.assertEqual(APIConnectionError.NO_TYPE_ERROR, exception.type)
        self.assertTupleEqual((self.end_date, self.start_date,), exception.values)

    def test_no_forms_input(self):
        self.assertListEqual([], self.api_conn.search_form_info(self.real_cik, forms=[]))

    def test_legit_request(self):
        # Reason for supressing warnings: https://linuxtut.com/en/db680489d1fbccac44f2/
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")

            results = self.api_conn.search_form_info(self.real_cik)
            self.assertTrue(len(results) != 0)
            keys = ['cik', 'issuing_entity', 'state_of_incorporation', 
            'ein', 'address', 'filings']
            for key in keys:
                self.assertTrue(key in results, f"Missing key: {key}")
            
            self.assertEqual(self.real_cik, results['cik'])
            self.assertListEqual(['10-K'], results['forms'])
            address_obj = results['address']
            keys = ['mailing', 'business']
            for key in keys:
                self.assertTrue(key in address_obj, f"Missing key: {key}")
            
            keys = ['street1', 'street2', 'city', 'stateOrCountry', 'zipCode', 'stateOrCountryDescription']
            for key in keys:
                self.assertTrue(key in address_obj['mailing'])
                self.assertTrue(key in address_obj['business'])            
            
            filing_obj = results['filings'][0]
            keys = ['reportDate', 'filingDate', 'document', 'form', 'isXBRL', 'isInlineXBRL']
            for key in keys:
                self.assertTrue(key in filing_obj, f"Missing key: {key}")