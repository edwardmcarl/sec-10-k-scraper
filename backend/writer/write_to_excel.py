import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, NamedTuple, Optional, Set

import pandas as pd

folder_dir = os.path.dirname(os.path.realpath(__file__))
parent_dir = os.path.dirname(folder_dir)
sys.path.append(parent_dir)

from api.connection import BulkAddressData  # noqa: E402


class FrontendFilingRequest(NamedTuple):
    entityName: str  # name of entity
    cikNumber: str  # cik number
    ein: str
    hqAddress: str
    stateOfIncorporation: str
    filingType: str  # type of filing
    filingDate: str  # filing date
    documentAddress10k: str  # document address for 10-K
    extractInfo: bool  # true/false if user wants to extract info from 10-K


@dataclass
class CompanyMetadata:  # subset of FormData, can be put in a Set
    cik: str
    issuing_entity: str
    state_of_incorporation: str
    ein: str
    address: BulkAddressData


@dataclass
class ExcelResultRow:
    name: str
    ein: str
    cik: str
    address: str
    state_of_incorporation: str
    item1: Optional[str]
    item1_ner: Optional[str]
    item1a: Optional[str]
    item1a_ner: Optional[str]
    item2: Optional[str]
    item2_ner: Optional[str]
    item3: Optional[str]
    item3_ner: Optional[str]
    item4: Optional[str]
    item5: Optional[str]
    item6: Optional[str]
    item7: Optional[str]
    item7_ner: Optional[str]
    item7a: Optional[str]
    item7a_ner: Optional[str]
    item8: Optional[str]
    item9: Optional[str]
    item9a: Optional[str]
    item9b: Optional[str]
    item10: Optional[str]
    item10_ner: Optional[str]
    item11: Optional[str]
    item12: Optional[str]
    item12_ner: Optional[str]
    item13: Optional[str]
    item13_ner: Optional[str]
    item14: Optional[str]
    item15: Optional[str]
    item16: Optional[str]


class DataWriter:
    """
    We need to:

     - Take in a request that is a *complete batch of requests, all at once*

     - Waits on all the requests

     - When it has all the requests, applies NER to them


     We need functions to:
        - Grab metadata for every company in the query V

        - Take in metadata + parsed text + NER results, and merge into one thing (perhaps a dataframe row?)

        - Load an xlsx to dataframe V

        - Make a dataframe with appropriate rows V

        - Add a row to the dataframe

        - Write a (sorted!) dataframe as an xlsx

        - Download a html file to a specific place

        - Take in a set of filings and:
            - Grab metadata
            - make all the requests
            - parse + NER each request
            - convert to dataframes
            - write each HTML to a file if-not-exists
            - load the main excel file from the working dir (create if-not-exists) as a dataframe
            - add all our produced dataframe rows to it
            - sort dataframe and overwrite the existing xlsx
    """

    SECTION_TITLES = {
        "item1": "1. Business",
        "item1_ner": "NER 1. Business",
        "item1a": "1A. Risk Factors",
        "item1a_ner": "NER 1A. Risk Factors",
        "item2": "2. Properties",
        "item2_ner": "NER 2. Properties",
        "item3": "3. Legal Proceedings",
        "item3_ner": "NER 3. Legal Proceedings",
        "item6": "6. [Reserved]",
        "item6_ner": "NER 6. [Reserved]",
        "item7": "7. Financial Condition",
        "item7_ner": "NER 7. Financial Condition",
        "item7a": "7A. Market Risk",
        "item7a_ner": "NER 7A. Market Risk",
        "item10": "10. Corporate Governance",
        "item10_ner": "NER 10. Corporate Governance",
        "item12": "12. Security Ownership and Stockholder Matters",
        "item12_ner": "NER 12. Security Ownership and Stockholder Matters",
        "item13": "13. Certain Relationships",
        "item13_ner": "NER 13. Certain Relationships",
    }

    def pwd(self):
        return os.getcwd()

    def _load_main_spreadsheet(self, working_directory: str):
        # assume that the working directory exists
        excel_path = Path(working_directory, "summary.xlsx")
        if excel_path.exists():
            return pd.read_excel(excel_path)
        else:
            column_names = [
                "Company Name",
                "EIN",
                "HQ Address",
                "State of Incorporation",
            ] + list(DataWriter.SECTION_TITLES.values())
            return pd.DataFrame(columns=column_names)

    # goes elsewhere

    def add_dataframe_row(
        self,
        df: pd.DataFrame,
        filing_info: Dict[str, Any],
        parser_results: Dict[str, Dict[str, str]],
        ner_results: Dict[str, Set[str]],
    ):
        metadata = {
            "EIN": filing_info["ein"],
            "Company Name": filing_info["entityName"],
            "HQ Address": filing_info["hqAddress"],
            "State of Incorporation": filing_info["stateOfIncorporation"],
        }
        cleaned_section_strings = {
            section: parser_results[section]["text"]
            for section in parser_results.keys()
        }
        for section in cleaned_section_strings:
            if len(cleaned_section_strings[section]) > 30000:
                cleaned_section_strings[
                    section
                ] = "See original document; Section too long for Excel"
        all_section_data = cleaned_section_strings | {
            f"{section}_ner": sorted(list(ner_results[section]))
            for section in ner_results.keys()
        }
        all_row_data = metadata | {
            DataWriter.SECTION_TITLES[key]: all_section_data[key]
            for key in all_section_data.keys()
        }
        all_row_data_formatted: Dict[str, Any] = {}
        for key in all_row_data.keys():
            all_row_data_formatted[key] = []
            all_row_data_formatted[key].append(all_row_data[key])
        for ele in all_row_data.keys():
            print(ele)
            print(len(all_row_data_formatted[ele]))
        # print(all_row_data) #todo remove debug
        new_row = pd.DataFrame(all_row_data_formatted)
        return pd.concat(
            [df, new_row], sort=False, verify_integrity=True, ignore_index=True
        )
