# Reason for escaping mypy type check: https://bugs.launchpad.net/beautifulsoup/+bug/1843791
# Can create a 'stublist' but wanted to get this commit first
import cProfile
import gzip
import os
import re
import sys
from typing import Any, Dict, List, Set
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import gevent  # type: ignore
import pandas as pd  # type: ignore
import spacy  # type: ignore # The smallest spacy model has virtually equivalent NER performance to the largest models, while running much faster
from bs4 import BeautifulSoup  # type: ignore

folder_dir = os.path.dirname(os.path.realpath(__file__))
parent_dir = os.path.dirname(folder_dir)
sys.path.append(parent_dir)
from misc.rate_limiting import RateLimited  # noqa: E402
from misc.rate_limiting import RateLimitTracker  # noqa: E402


def ner_model_directory():
    """Get absolute path to resource, works for dev and for PyInstaller"""
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:  # If we're not pyinstaller, use the current working directory (assumed to be the 'backend' folder)
        base_path = os.path.abspath(".")

    return os.path.join(base_path, os.path.normpath("resources/en_core_web_sm-3.2.0"))


nlp = spacy.load(ner_model_directory())


class ParserError(Exception):
    DOCUMENT_NOT_SUPPORTED = "Parsing for this document is not supported"
    SERVER_ERROR = "The SEC EDGAR server could not process the request"
    CONNECTION_ERROR = "The application failed to reach the server"
    UNEXPECTED_ERROR = "Something occured when decompressing and/or decoding response from SEC EDGAR server"
    NO_FILE_EXISTS_ERROR = "The file requested does not exist in SEC EDGAR database"

    def __init__(self, message: str, *values: object, originalError=None) -> None:
        self.message = message
        self.values = values
        self.originalError = originalError
        super().__init__(self.message)


class Parser(RateLimited):
    HTML5LIB = 0
    HTML_PARSER = 1
    LXML = 2

    _SECTION_NUMBER_REGEX = r"(1(A|B|0|1|2|3|4|5|6)?)|2|3|4|5|6|(7(A)?)|8|(9(A|B)?)"
    _SINGLE_FIELD_REGEX = (
        r"(>(Ite|ITE|te|TE|e|E)?(m|M)(\s|&#160;|&nbsp;))|(ITEM(\s|&#160;|&nbsp;))"
    )
    _COMBINED_FIELD_REGEX = (
        r"(>(Ite|ITE|te|TE|e|E)?(ms|MS)(\s|&#160;|&nbsp;))|(ITEMS(\s|&#160;|&nbsp;))"
    )
    _END_REGEX = r"\.?"
    COMPLETE_SINGLE_FIELD_REGEX = (
        rf"({_SINGLE_FIELD_REGEX})({_SECTION_NUMBER_REGEX}){_END_REGEX}"
    )
    COMPLETE_COMBINED_FIELD_REGEX = (
        rf"({_COMBINED_FIELD_REGEX})({_SECTION_NUMBER_REGEX}){_END_REGEX}"
    )
    COMPLETE_REGEX = (
        rf"({COMPLETE_SINGLE_FIELD_REGEX })|({COMPLETE_COMBINED_FIELD_REGEX})"
    )

    EXTRACTED_FIELDS = [
        "item1",
        "item1a",
        "item2",
        "item3",
        "item6",
        "item7",
        "item7a",
        "item10",
        "item12",
        "item13",
    ]

    DICT_FIELDS = {
        "item1": 0,
        "item1a": 1,
        "item1b": 2,
        "item2": 3,
        "item3": 4,
        "item4": 5,
        "item5": 6,
        "item6": 7,
        "item7": 8,
        "item7a": 9,
        "item8": 10,
        "item9": 11,
        "item9a": 12,
        "item9b": 13,
        "item10": 14,
        "item11": 15,
        "item12": 16,
        "item13": 17,
        "item14": 18,
        "item15": 19,
        "item16": 20,
    }

    def __init__(self, limit_counter: RateLimitTracker) -> None:
        """
        Constructor. Takes in a RateLimitTracker to handle the rate-limiting of API requests.

            Parameters:
                limit_counter: a RateLimitTracker. As of 2022, it should
                be set to 10 reqeusts per second or fewer for the SEC API.
        """
        super().__init__(limit_counter)

    def _get_html_data(self, document_url: str):
        if not (document_url.endswith(".htm") or document_url.endswith(".html")):
            raise ParserError(ParserError.DOCUMENT_NOT_SUPPORTED, document_url)

        hdrs = {
            "Host": "www.sec.gov",
            "User-Agent": "Lafayette College yevenyos@lafayette.edu",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept": "*/*",
        }
        req = Request(document_url, headers=hdrs, method="GET")

        # Block until we can make a request without hitting the rate limit
        self._block_on_rate_limit()
        try:
            with urlopen(req) as res:
                data = res.read()
                encoding = res.info().get_content_charset("utf-8")
                # Decompressing received data
                try:
                    data = gzip.decompress(data)
                    data = data.decode(encoding)
                except Exception as e:
                    raise ParserError(ParserError.UNEXPECTED_ERROR, originalError=e)
        # HTTPError has to come before URLError. HTTPError is a subset of URLError
        except HTTPError as e:
            if e.code == 404:
                raise ParserError(
                    ParserError.NO_FILE_EXISTS_ERROR,
                    document_url,
                    originalError=e,
                )
            else:
                raise ParserError(ParserError.SERVER_ERROR, originalError=e)
        except URLError as f:
            raise ParserError(ParserError.CONNECTION_ERROR, originalError=f)

        return data

    def parse_document(self, document_url: str) -> Dict[str, Dict[str, str]]:

        # This logic is influenced by this GitHub gist: https://gist.github.com/anshoomehra/ead8925ea291e233a5aa2dcaa2dc61b2
        parser = "lxml"

        data = self._get_html_data(document_url)
        raw_10k = data
        regex = re.compile(Parser.COMPLETE_REGEX)

        matches = regex.finditer(raw_10k)
        matched_list = [(x.group(), x.start(), x.end()) for x in matches]
        if len(matched_list) == 0:
            return {}
        df = pd.DataFrame(matched_list)

        df.columns = ["item", "start", "end"]

        df.replace("&#160;", " ", regex=True, inplace=True)
        df.replace("&nbsp;", " ", regex=True, inplace=True)
        df.replace("\\s", "", regex=True, inplace=True)
        df.replace("\\.", "", regex=True, inplace=True)
        df.replace(">", "", regex=True, inplace=True)
        df.replace("ITEM", "TEM", regex=True, inplace=True)
        df.replace("TEM", "EM", regex=True, inplace=True)
        df.replace("EM", "M", regex=True, inplace=True)
        df.replace("Item", "tem", regex=True, inplace=True)
        df.replace("tem", "em", regex=True, inplace=True)
        df.replace("em", "m", regex=True, inplace=True)
        df.replace("m", "Item", regex=True, inplace=True)
        df.replace("M", "ITEM", regex=True, inplace=True)
        df.replace("ITEMS", "ITEM", regex=True, inplace=True)
        df.replace("Items", "Item", regex=True, inplace=True)

        remove_rows = []
        for _, row in df.iterrows():
            item_key = str(row["item"])
            if item_key.isupper():
                characters_after = raw_10k[row["start"] : row["start"] + 256]
                if re.search(r"\((C|c)ontinued\)", characters_after) is not None:
                    remove_rows.append(_)
                else:
                    for key, value in df.iterrows():
                        row_key = str(value["item"])
                        if (
                            row_key.lower() == item_key.lower()
                            and not row_key.isupper()
                        ):
                            remove_rows.append(key)
        df.drop(remove_rows, inplace=True)
        df["item"] = df.item.str.lower()

        pos_df = df.sort_values("start", ascending=True).drop_duplicates(
            subset=["item"], keep="last"
        )

        pos_df = (
            pos_df.assign(
                sort_value=lambda x: [Parser.DICT_FIELDS[value] for value in x["item"]]
            )
            .sort_values("sort_value")
            .drop(labels=["sort_value"], axis=1)
        )
        pos_df.reset_index(drop=True, inplace=True)
        df.reset_index(drop=True, inplace=True)
        remove_rows = []
        continue_loop = True
        while continue_loop:
            gevent.sleep(0)  # yield execution to e.g. allow heartbeat signals
            continue_loop = False
            if pos_df["start"].size > 1:
                for row in pos_df.itertuples():  # type: ignore
                    if row[0] == 0 and row[2] > pos_df["start"].loc[row[0] + 1]:
                        remove_rows.append(row[1])
                        pos_df = pos_df.drop([row[0]]).reset_index(drop=True)
                        continue_loop = True
                        break
                    elif (
                        row[0] == pos_df["start"].size - 1
                        and row[2] < pos_df["start"].loc[row[0] - 1]
                    ):
                        remove_rows.append(row[1])
                        pos_df = pos_df.drop([row[0]]).reset_index(drop=True)
                        continue_loop = True
                        break
                    elif (
                        row[0] > 0
                        and row[0] < pos_df["start"].size - 1
                        and row[2] < pos_df["start"].loc[row[0] - 1]
                    ):
                        remove_rows.append(row[1])
                        pos_df = pos_df.drop([row[0]]).reset_index(drop=True)
                        continue_loop = True
                        break

        pos_df.set_index("item", inplace=True)
        df_list = []
        for item in remove_rows:
            gevent.sleep(0)  # yield execution
            max_value_index = None
            max_value = -1
            for row in df.itertuples():  # type: ignore
                if row[1] == item and max_value < row[2]:
                    location_start = None
                    location_end = None
                    index = Parser.DICT_FIELDS[item]
                    fields = list(Parser.DICT_FIELDS.keys())
                    for i in range(len(fields[:index]) - 1, -1, -1):
                        if fields[i] in pos_df.index:
                            location_start = fields[i]
                            break

                    for i in range(len(fields[index:])):
                        if fields[i] in pos_df.index:
                            location_end = fields[i]
                            break

                    if location_start is None and location_end is None:
                        pass
                    elif location_start is None:
                        if pos_df["start"].loc[location_end] > row[2]:
                            max_value_index = row[0]
                            max_value = row[2]
                    elif location_end is None:
                        if pos_df["start"].loc[location_start] < row[2]:
                            max_value_index = row[0]
                            max_value = row[2]
                    else:
                        if (
                            pos_df["start"].loc[location_start] < row[2]
                            and pos_df["start"].loc[location_end] > row[2]
                        ):
                            max_value_index = row[0]
                            max_value = row[2]
            if max_value_index is not None:
                df_list.append(
                    pd.DataFrame(
                        {
                            "start": [df["start"].loc[max_value_index]],
                            "end": [df["end"].loc[max_value_index]],
                            "item": [df["item"].loc[max_value_index]],
                        }
                    ).set_index("item")
                )
        if len(df_list) != 0:
            df_list.append(pos_df)
            pos_df = pd.concat(df_list).sort_values("start", ascending=True)

        document_map = {}
        index_length = len(pos_df.index)
        for index, item in enumerate(pos_df.index):
            gevent.sleep(0)  # yield execution
            if item in Parser.EXTRACTED_FIELDS:
                if index < index_length - 1:
                    text = raw_10k[
                        pos_df["start"]
                        .loc[item] : pos_df["start"]
                        .loc[pos_df.index[index + 1]]
                    ]
                else:
                    text = raw_10k[pos_df["start"].loc[item] :]
                soup = BeautifulSoup(text, parser)
                gevent.sleep(0)  # yield execution
                soup_html = soup.prettify()
                gevent.sleep(0)
                soup_text = soup.get_text("\n")
                gevent.sleep()
                document_map[item] = {
                    "html": soup_html,
                    "text": soup_text,
                }

        return document_map

    def _get_section_ner_labels(self, section_string: str):
        """
        Function that, given a section name (e.g. "item1", "item1a", "item2"),
        returns a list of NER tags, as strings, that the parser should extract
        from the body of that section. Returns an empty list for sections that should
        not have NER data extracted.

        For a list of possible tags, see
        https://spacy.io/models/en
        To see the meanings of the tags, see
        https://github.com/explosion/spaCy/blob/master/spacy/glossary.py

        """
        proper_name_labels = ["PERSON", "ORG"]
        place_name_labels = ["GPE", "FAC", "LOC"]
        section_targets = {
            "item1a": proper_name_labels,
            "item2": place_name_labels,
            "item3": proper_name_labels,
            "item7": proper_name_labels,
            "item7a": proper_name_labels,
            "item10": ["PERSON"],
            "item12": proper_name_labels,
            "item13": proper_name_labels,
        }
        if section_string in section_targets.keys():
            return section_targets[section_string]
        else:
            return []

    def _apply_named_entity_recognition(
        self, doc_map: Dict[str, Any]
    ) -> Dict[str, Set[str]]:
        """
        Given the output of the parser for a 10-K form, applies NER to the extracted test.

        Returns a Dict[str, Set(str)] where each key-value pair is:
            key:    An element of EXTRACTED_FIELDS, if that field was detected in the document
            values: A Set of strings, where each string is a relevant named entity extracted
                    from the text of that field.

        The function _get_section_ner_labels() is used to determine which types of entity are
        included in the set for each field.

        """

        def extract_specific_labels(
            string: str, labels_to_gather: List[str]
        ) -> Set[str]:

            processed_doc = nlp(string)
            count = 0  # yield the event loop every 100 tokens processed
            # Compile all the tokens matching the labels into a single set
            tokens_matching_labels = set()
            count = (count + 1) % 100
            if count == 0:
                gevent.sleep(0)
            for entity in processed_doc.ents:
                if entity.label_ in labels_to_gather:
                    tokens_matching_labels.add(entity.text)

            return tokens_matching_labels

        section_texts = {
            section: extract_specific_labels(
                doc_map[section]["text"], self._get_section_ner_labels(section)
            )
            for section in doc_map.keys()
        }
        return section_texts


def profile_this():
    docurl = "https://www.sec.gov/Archives/edgar/data/0000037996/000003799621000012/f-20201231.htm"
    c = RateLimitTracker(5)
    x = Parser(c)
    x.parse_document(docurl)


if __name__ == "__main__":
    cProfile.run("profile_this()", "profiling.txt")
