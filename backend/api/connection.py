import gzip
import json
import re
from datetime import date
from typing import Any, Dict, List
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from zerorpc import Server  # type: ignore # noqa: F401


class APIConnectionError(Exception):
    """
    Exception class for the APIConnection class

    Class Properties
        APIConnectionError.NO_TYPE_ERROR
            This value represents an APIConnectionError that is raised by the APIConnectionError class.

        APIConnectionError.HTTP_TYPE_ERROR
            This value represents an APIConnectionError that is raised by an urllib.error.HTTPError
            exception.

        APIConnectionError.URL_TYPE_ERROR
            This value represents an APIConnectionError that is raised by an urllib.error.URLError
            exception.

        APIConnectionError.SERVER_ERROR
            Message passed to the raised APIConnectionError class when there is an error from
            the SEC EDGAR database.

        APIConnectionError.CONNECTION_ERROR
            Message passed to the raised APIConnectionError class when there is an error connecting
            to SEC EDGAR database.

        APIConnectionError.SEARCH_KEY_ERROR
            Message passed to the raised APIConnectionError class when an empty seach key is passed
            into the APIConnection.search method.

        APIConnectionError.CIK_INPUT_ERROR
            Message format passed to the raised APIConnectionError class when a CIK number of the wrong format
            is passed into APIConnection.search_form_info method.

        APIConnectionError.START_DATE_FORMAT_ERROR
            Message format passed to the raised APIConnectionError class when the start date is not in ISO format

        APIConnectionError.END_DATE_FORMAT_ERROR
            Message format passed to the raised APIConnectionError class when the end date is not in ISO format

        APIConnectionError.START_DATE_INPUT_ERROR
            Message format passed to the raised APIConnectionError class when the start date earlier than the
            earliest date supported by the SEC EDGAR database

        APIConnectionError.END_DATE_INPUT_ERROR
            Message format passed to the raised APIConnectionError class when the end date earlier than the
            latest date supported by the SEC EDGAR database

        APIConnectionError.DATE-INPUT_ERROR
            Message format passed to the raised APIConnectionError class when the start date is later than the end date.

    Object Properties
        APIConnectionError.message
            This string property represents the reason for the error.

        APIConnectionError.originalError
            This string property represents the original error that
            caused the APIConnectionError. Value is None if error is
            raised by the APIConnection class.

        APIConnectionError.type
            This value represents what type of error caused the raise of APIConnectionError.

        APIConnectionError.value
            Input value that caused the raise of APIConnectionError.
    """

    # Error types
    NO_TYPE_ERROR = 0
    HTTP_TYPE_ERROR = 1
    URL_TYPE_ERROR = 2
    UNEXPECTED_TYPE_ERROR = 3

    # Error messages
    SERVER_ERROR = "The SEC EDGAR server could not process the request"
    CONNECTION_ERROR = "The application failed to reach the server"
    SEARCH_KEY_ERROR = "Search key must not be empty string"
    CIK_INPUT_ERROR = "CIK number input not in correct format"
    START_DATE_FORMAT_ERROR = "Start date input not in ISO format"
    END_DATE_FORMAT_ERROR = "End date input not in ISO format"
    START_DATE_INPUT_ERROR = "Start date cannot be earlier than 1994-01-01"
    END_DATE_INPUT_ERROR = "End date cannot be later than today's date"
    DATE_INPUT_ERROR = "Start date cannot be later than end date"
    UNEXPECTED_ERROR = "Something occured when decompressing and/or decoding response from SEC EDGAR server"
    NO_CIK_EXISTS_ERROR = "The CIK number input does not exist in SEC EDGAR database"
    FORM_KIND_ERROR = "The form type inputted is not supported by this application"

    def __init__(self, message, *values, originalError=None):
        self.message = message
        self.originalError = originalError
        self.values = values
        if isinstance(self.originalError, HTTPError):
            self.type = APIConnectionError.HTTP_TYPE_ERROR
        elif isinstance(self.originalError, URLError):
            self.type = APIConnectionError.URL_TYPE_ERROR
        elif isinstance(self.originalError, Exception):
            self.type = APIConnectionError.UNEXPECTED_TYPE_ERROR
        else:
            self.type = APIConnectionError.NO_TYPE_ERROR
        super().__init__(self.message)


class APIConnection:
    """
    A class that handles the connection to the SEC EDGAR database

    Class Properties
        APIConnection.SEARCH_URL
            SEC hidden API endpoint used to fulfil the search functionality.

        APIConnection.MINIMUM_SEARCH_START_DATE
            The earliest filing start date input for document querying. This date is the
            earliest filing record that the SEC EDGAR database has in storage on any entity or company.
    """

    # Global properties
    SEARCH_URL = "https://efts.sec.gov/LATEST/search-index"

    # Update APIConnectionError.START_DATE_INPUT_ERROR when MINIMUM_SEARCH_START_DATE value changes
    MINIMUM_SEARCH_START_DATE = "1994-01-01"

    ALLOWED_FORMS = ["10-K", "10-Q", "20-F"]

    def _format_cik(self, cik: int) -> str:
        """
        Helper function that converts the numerical CIK value returned by the EDGAR database (format: \\d{1:10})
        into the correct format for the 10-K document query (format: ^CIK\\d{10}$)
        """
        zeroList = ["0" for i in range(10 - len(str(cik)))]
        return f"CIK{''.join(zeroList)}{cik}"

    def search(self, search_key: str) -> List[Dict[str, str]]:
        """
        Calls to the SEC EDGAR interface to search through the database to return entities
         that match the search key

        Parameters
            search_key
                Search key that is passed to the SEC EDGAR server

        Returns
            An array of map objects which contain the entity name and CIK number of entities
            that match the search key in descending order of score matching.
            Example:
            [
                {
                    "cik": "CIK##########",
                    "entity": "Entity Name"
                },
                ...
            ]
        """
        # Data validation
        search_key = search_key.strip()
        if len(search_key) == 0:
            raise APIConnectionError(APIConnectionError.SEARCH_KEY_ERROR)

        # Request to server
        data_sent = str.encode(f'{{"keysTyped":"{search_key}"}}')
        req = Request(APIConnection.SEARCH_URL, data=data_sent, method="POST")

        # Data aggregation
        try:
            with urlopen(req) as res:
                data = res.read()
                try:
                    encoding = res.info().get_content_charset("utf-8")
                    data = json.loads(data.decode(encoding))
                except Exception as e:
                    raise APIConnectionError(
                        APIConnectionError.UNEXPECTED_ERROR, originalError=e
                    )

                hits = data["hits"] if data["hits"] else []
                hits = hits["hits"] if hits["hits"] else []
                return [
                    {
                        "cik": self._format_cik(hit["_id"]),
                        "entity": hit["_source"]["entity"],
                    }
                    for hit in hits
                ]

        # HTTPError has to come before URLError. HTTPError is a subset of URLError
        except HTTPError as e:
            raise APIConnectionError(APIConnectionError.SERVER_ERROR, originalError=e)
        except URLError as f:
            raise APIConnectionError(
                APIConnectionError.CONNECTION_ERROR, originalError=f
            )

    def search_form_info(
        self,
        cik_number: str,
        forms: List[str] = ["10-K"],
        start_date: str = MINIMUM_SEARCH_START_DATE,
        end_date: str = date.today().isoformat(),
    ) -> Dict[str, Any]:
        """
        Calls to the SEC EDGAR interface to search through the database to return entities
         that match the search key

        Parameters
            cik_number
                Search key that is passed to the SEC EDGAR server

            forms
                List of forms to be retrieved from SEC EDGAR server. The forms accepted are
                10-K, 10-Q and 20-F form options

            start_date
                String input in Date ISO Format. Must not be less than 1994-01-01

            end_date
                String input in Date ISO Format. Must not be greater than today's date

        Returns
            A map object that contains the Filing year,
            Commission File number of the issuing entity,
            Exact name of the issuing entity, State of incorporation,
            IRS Employer, Identification Number,
            address of principal offices, and Zip code and document filing data.

            Example:
            {
                    "cik": "CIK##########",
                    "issuing_entity": "",
                    "state_of_incorporation": "",
                    "ein": "",
                    "forms": []
                    "address": {
                        "mailing": {
                            "street1": None,
                            "street2": None,
                            "city": None,
                            "stateOrCountry": "",
                            "zipCode": None,
                            "stateOrCountryDescription": ""
                        },
                        "business": {
                            "street1": None,
                            "street2": None,
                            "city": None,
                            "stateOrCountry": "",
                            "zipCode": None,
                            "stateOrCountryDescription": ""
                        }
                    },
                    "filings": {
                        "reportDate": "",
                        "filingDate: "",
                        "document": "",
                        "form": "",
                        "isXBRL": 0,
                        "isInlineXBRL": 0
                    },
                }
        """

        # Data validation
        if len(forms) == 0:
            return {}
        cik_number_updated = cik_number.upper()
        forms_updated = [item.upper() for item in forms]

        for item in forms_updated:
            if item not in APIConnection.ALLOWED_FORMS:
                raise (APIConnectionError(APIConnectionError.FORM_KIND_ERROR, item))

        if not re.match(r"^CIK\d{10}$", cik_number_updated):
            raise APIConnectionError(APIConnectionError.CIK_INPUT_ERROR, cik_number)
        try:
            date.fromisoformat(start_date)
        except ValueError:
            raise APIConnectionError(
                APIConnectionError.START_DATE_FORMAT_ERROR, start_date
            )
        try:
            date.fromisoformat(end_date)
        except ValueError:
            raise APIConnectionError(APIConnectionError.END_DATE_FORMAT_ERROR, end_date)

        if start_date < APIConnection.MINIMUM_SEARCH_START_DATE:
            raise APIConnectionError(
                APIConnectionError.START_DATE_INPUT_ERROR, start_date
            )
        elif end_date > date.today().isoformat():
            raise APIConnectionError(APIConnectionError.END_DATE_INPUT_ERROR, end_date)
        elif start_date > end_date:
            raise APIConnectionError(
                APIConnectionError.DATE_INPUT_ERROR, start_date, end_date
            )

        return self._send_request(
            cik_number_updated,
            forms_updated,
            start_date,
            end_date,
            f"{cik_number_updated}.json",
        )

    """
    A helper function for APIConnection.search_form_info
    """

    def _send_request(
        self,
        cik_number: str,
        forms: List[str],
        start_date: str,
        end_date: str,
        request_document: str,
        prev_data=None,
    ) -> Dict[str, Any]:
        # Making request to server
        data_api = f"https://data.sec.gov/submissions/{request_document}"
        hdrs = {
            "Host": "data.sec.gov",
            "User-Agent": "Lafayette College yevenyos@lafayette.edu",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept": "*/*",
        }
        req = Request(data_api, headers=hdrs, method="GET")
        try:
            with urlopen(req) as res:
                data = res.read()
                encoding = res.info().get_content_charset("utf-8")
                # Decompressing received data
                try:
                    decompressed_data = gzip.decompress(data)
                    data = json.loads(decompressed_data.decode(encoding))
                except Exception as e:
                    raise APIConnectionError(
                        APIConnectionError.UNEXPECTED_ERROR, originalError=e
                    )

                if prev_data is None:
                    returned_data = {
                        "cik": cik_number,
                        "issuing_entity": data["name"],
                        "forms": forms,
                        "state_of_incorporation": data["stateOfIncorporation"],
                        "ein": data["ein"] if data["ein"] is not None else "",
                        "address": data["addresses"],
                        "filings": [],
                    }
                    recent_filings = data["filings"]["recent"]
                else:
                    returned_data = prev_data
                    recent_filings = data

                for i in range(len(recent_filings["accessionNumber"])):
                    if (
                        recent_filings["filingDate"][i] >= start_date
                        and recent_filings["filingDate"][i] <= end_date
                    ):
                        if recent_filings["form"][i] in forms:
                            cik = cik_number.strip("CIK").strip("0")
                            raw_accession_number = recent_filings["accessionNumber"][i]
                            accession_number = raw_accession_number.replace("-", "")
                            doc = (
                                f"{recent_filings['accessionNumber'][i]}.txt"
                                if len(recent_filings["primaryDocument"][i]) == 0
                                else recent_filings["primaryDocument"][i]
                            )
                            is_xbrl = recent_filings["isXBRL"][i]
                            is_inline_xbrl = recent_filings["isInlineXBRL"][i]
                            returned_data["filings"].append(
                                {
                                    "reportDate": recent_filings["reportDate"][i],
                                    "filingDate": recent_filings["filingDate"][i],
                                    "form": recent_filings["form"][i],
                                    "document": f"https://sec.gov/Archives/edgar/data/{cik}/{accession_number}/{doc}",
                                    "parserDocument": f"https://sec.gov/Archives/edgar/data/{cik}/{accession_number}/{raw_accession_number}.txt",
                                    "isXBRL": is_xbrl,
                                    "isInlineXBRL": is_inline_xbrl,
                                }
                            )
                    else:
                        break
                if prev_data is None and "files" in data["filings"]:
                    for i in range(len(data["filings"]["files"])):
                        if data["filings"]["files"][i]["filingTo"] >= start_date:
                            returned_data = self._send_request(
                                cik_number,
                                forms,
                                start_date,
                                end_date,
                                data["filings"]["files"][i]["name"],
                                prev_data=returned_data,
                            )
                return returned_data
        # HTTPError has to come before URLError. HTTPError is a subset of URLError
        except HTTPError as e:
            if e.code == 404:
                if f"{cik_number}.json" == request_document:
                    # Thrown when cik number input does not exist but meets format.
                    raise APIConnectionError(
                        APIConnectionError.NO_CIK_EXISTS_ERROR,
                        cik_number,
                        originalError=e,
                    )
                else:
                    # Thrown when requested json document found in 'files' property of a legit cik_number's
                    # f'https://data.sec.gov/submissions/{cik_number}.json' request response does not exist.
                    # Can be ignored but should preferrably be logged.
                    return returned_data

            raise APIConnectionError(APIConnectionError.SERVER_ERROR, originalError=e)
        except URLError as f:
            raise APIConnectionError(
                APIConnectionError.CONNECTION_ERROR, originalError=f
            )
