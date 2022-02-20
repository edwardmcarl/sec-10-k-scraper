from typing import Dict, List
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
import gzip
import json
from datetime import date
import re

SEARCH_URL = 'https://efts.sec.gov/LATEST/search-index'
MINIMUM_SEARCH_START_DATE = '1994-01-01'

class APIConnectionError(Exception):
    """
    Exception class for the APIConnection class

    Class Properties
        APIConnectionError.NO_ORIGINAL_ERROR
            This value represents an APIConnectionError that is raised by the APIConnectionError class.
        
        APIConnectionError.HTTP_ERROR
            This value represents an APIConnectionError that is raised by an urllib.error.HTTPError
            exception.
        
        APIConnectionError.URL_ERROR
            This value represents an APIConnectionError that is raised by an urllib.error.URLError
            exception.
    
    Object Properties
        APIConnectionError.message
            This string property represents the reason for the error
        
        APIConnectionError.originalError
            This string property represents the original error that
            caused the APIConnectionError. Value is None if error is
            raised by the APIConnection class
    """
    NO_ORIGINAL_ERROR = 0
    HTTP_ERROR = 1
    URL_ERROR = 2

    def __init__(self, message, originalError=None):
        self.message = message
        self.originalError = originalError
        if isinstance(self.originalError, HTTPError):
            self.type = APIConnectionError.HTTP_ERROR
        elif isinstance(self.originalError, URLError):
            self.type = APIConnectionError.URL_ERROR
        else:
            self.type = APIConnectionError.NO_ORIGINAL_ERROR
        super().__init__(self.message)


class APIConnection:
    """
    A class that handles the connection to the SEC EDGAR database
    """

    def formatCIK(self, cik: int) -> str:
        """
        Converts the numerical CIK value returned by the EDGAR database (format: \d{1:10}) 
        into the correct format for the 10-K document query (format: ^CIK\d{10}$)

        Parameters
            cik
                Numerical cik value from the SEC EDGAR server
        
        Returns
            The formatted CIK number in the format: ^CIK\d{10}$
        """
        zeroList = ['0' for i in range(10-len(str(cik)))]
        return f"CIK{''.join(zeroList)}{cik}" 

    def search(self, searchKey: str) -> Dict[str, str]:
        """
        Calls to the SEC EDGAR interface to search through the database to return entities
         that match the search key

        Parameters
            searchKey
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
        #Data validation
        searchKey = searchKey.strip()
        if len(searchKey) == 0:
            raise APIConnectionError('Company Name must not be empty')
        
        #Request to server
        dataSent = str.encode(f'{{"keysTyped":"{searchKey}"}}')
        req = Request(self.SEARCH_URL, 
            data=dataSent, method='POST')
        
        #Data aggregation
        try:
            with urlopen(req) as res:
                if res.status < 200 and res.status >= 400:
                    raise f'{res.status}: {res.reason}'
                
                data = res.read()
                encoding = res.info().get_content_charset('utf-8')
                data = json.loads(data.decode(encoding))
                hits = data['hits'] if data['hits'] else []
                hits = hits['hits'] if hits['hits'] else []
                return [{"cik": self.formatCIK(hit['_id']), "entity": hit['_source']['entity']} for hit in hits]
        except HTTPError as e:
            raise APIConnectionError('The SEC EDGAR server could not process the request.', originalError=e)
        except URLError as f:
            raise APIConnectionError('The application failed to reach the server. Check internet connection.', originalError=f)
            

    def search10KInfo(self, cikNumber: str, forms: List[str] = ['10-K'], startDate: str = MINIMUM_SEARCH_START_DATE, 
                            endDate: str = date.today().isoformat()) -> List[str]:
        """
        Calls to the SEC EDGAR interface to search through the database to return entities
         that match the search key

        Parameters
            cikNumber
                Search key that is passed to the SEC EDGAR server
            
            forms
                List of forms to be retrieved from SEC EDGAR server
            
            startDate
                String input in Date ISO Format. Must not be less than 1994-01-01
            
            endDate
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
                    "state_of_incorporation': "",
                    "ein": "",
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
                        "isINlineXBRL": 0
                    },
                }
        """

        # Data validation
        cikNumber = cikNumber.upper()
        forms = [item.upper() for item in forms]
        if not re.match(r'^CIK\d{10}$', cikNumber):
            raise APIConnectionError(f'CIK Number input not in correct format!\
                 => {cikNumber}. Should be of format CIK########## where # is a digit.')
        elif startDate < MINIMUM_SEARCH_START_DATE:
            raise APIConnectionError(f'Start date cannot be less than this date: {MINIMUM_SEARCH_START_DATE}!')
        elif endDate > date.today().isoformat():
            raise APIConnectionError(f'End date cannot be less than today: {date.today().isoformat()}!')
        elif startDate > endDate:
            raise APIConnectionError('Start date cannot be greater than end date!')
        return self._sendRequest(cikNumber, forms, startDate, endDate, f'{cikNumber}.json')

    """
    A helper function for APIConnection.search10KInfo
    """
    def _sendRequest(self, cikNumber: str, forms: List[str], startDate: str, endDate: str, requestDocument: str, prevData = None) -> List[str]:
        dataAPI = f'https://data.sec.gov/submissions/{requestDocument}'
        hdrs = {'Host': 'data.sec.gov',
                'User-Agent': 'Lafayette College yevenyos@lafayette.edu',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept': '*/*'}
        req = Request(dataAPI, headers=hdrs, method='GET')
        try:
            with urlopen(req) as res:
                data = res.read()
                encoding = res.info().get_content_charset('utf-8')
                try:
                    decompressedData = gzip.decompress(data)
                    data = json.loads(decompressedData.decode(encoding))
                except Exception as e:
                    raise APIConnectionError("Unexpected error occured when decompressing and decoding data from SEC EDGAR server.", originalError=e)

                if prevData is None:
                    returnedData = {"cik": cikNumber, "issuing_entity": data['name'],
                    'state_of_incorporation': data['stateOfIncorporation'],
                    "ein": data['ein'] if data['ein'] is not None else '', "address": data['addresses'], 'filings':[]}
                    recentFilings = data['filings']['recent']
                else:
                    returnedData = prevData
                    recentFilings = data
                
                for i in range(len(recentFilings['accessionNumber'])):
                    if recentFilings['filingDate'][i] >= startDate and recentFilings['filingDate'][i] <= endDate:
                        if recentFilings['form'][i] in forms:
                            cik = cikNumber.strip('CIK').strip('0')
                            accessionNumber = recentFilings['accessionNumber'][i].replace('-', '')
                            doc = f"{recentFilings['accessionNumber'][i]}.txt" if len(recentFilings['primaryDocument'][i]) == 0 else recentFilings['primaryDocument'][i]
                            isXBRL = recentFilings['isXBRL'][i]
                            isInlineXBRL = recentFilings['isInlineXBRL'][i]
                            returnedData['filings'].append({'reportDate': recentFilings['reportDate'][i], 
                            'filingDate': recentFilings['filingDate'][i], "form": recentFilings['form'][i],
                            'document': f'https://sec.gov/Archives/edgar/data/{cik}/{accessionNumber}/{doc}',
                            'isXBRL': isXBRL, 'isInlineXBRL': isInlineXBRL})
                    else:
                        break
                if prevData is None and 'files' in data['filings']:
                    for i in range(len(data['filings']['files'])):
                        if data['filings']['files'][i]['filingTo'] >= startDate:
                            returnedData = self._sendRequest(cikNumber, forms, startDate, endDate, data['filings']['files'][i]['name'], prevData=returnedData)
                return returnedData
        except HTTPError as e:
            raise APIConnectionError('The SEC EDGAR server could not process the request.', originalError=e)
        except URLError as f:
            raise APIConnectionError('The application failed to reach the server. Check internet connection.', originalError=f)
print(APIConnection().search10KInfo('CIK0000038009'))