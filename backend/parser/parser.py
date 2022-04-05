# Reason for escaping mypy type check: https://bugs.launchpad.net/beautifulsoup/+bug/1843791
# Can create a 'stublist' but wanted to get this commit first
import gzip
import re
from typing import Dict
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import pandas as pd  # type: ignore
from bs4 import BeautifulSoup  # type: ignore


class ParserError(Exception):
    PARSER_TOOL_NOT_SUPPORTED = "Specified parser tool not supported"
    DOCUMENT_NOT_SUPPORTED = "Parsing for this document is not supported"
    SERVER_ERROR = "The SEC EDGAR server could not process the request"
    CONNECTION_ERROR = "The application failed to reach the server"
    UNEXPECTED_ERROR = "Something occured when decompressing and/or decoding response from SEC EDGAR server"
    NO_FILE_EXISTS_ERROR = "The file requested does not exist in SEC EDGAR database"

    def __init__(self, message: str, *values: object, originalError=None) -> None:
        self.message = message
        super().__init__(self.message)


class Parser:
    HTML5LIB = 0
    HTML_PARSER = 1
    LXML = 2
    FIELD_REGEX = r"((>(I){0,1}(tem|TEM)(\s|&#160;|&nbsp;)|ITEM(\s|&#160;|&nbsp;))(1(A|B|0|1|2|3|4|5|6){0,1}|2|3|4|5|6|7|7A|8|9(A|B){0,1}))\.{0,1}"
    COMBINED_FIELD_REGEX = r"((>(I){0,1}(tems|TEMS)(\s|&#160;|&nbsp;)|ITEMS(\s|&#160;|&nbsp;))(1(A|B|0|1|2|3|4|5|6){0,1}|2|3|4|5|6|7|7A|8|9(A|B){0,1}))\.{0,1}"
    COMPLETE_REGEX = rf"({FIELD_REGEX})|({COMBINED_FIELD_REGEX})"

    FIELDS = [
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

    def parse_document(
        self, document_url: str, parser_tool: int = LXML
    ) -> Dict[str, Dict[str, str]]:

        # This logic is influenced by this GitHub gist: https://gist.github.com/anshoomehra/ead8925ea291e233a5aa2dcaa2dc61b2
        if parser_tool == Parser.HTML5LIB:
            parser = "html5lib"
        elif parser_tool == Parser.HTML_PARSER:
            parser = "html.parser"
        elif parser_tool == Parser.LXML:
            parser = "lxml"
        else:
            raise ParserError(ParserError.PARSER_TOOL_NOT_SUPPORTED, parser)

        if not (document_url.endswith(".txt")):
            raise ParserError(ParserError.DOCUMENT_NOT_SUPPORTED, document_url)

        hdrs = {
            "Host": "www.sec.gov",
            "User-Agent": "Lafayette College yevenyos@lafayette.edu",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept": "*/*",
        }
        req = Request(document_url, headers=hdrs, method="GET")
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

        raw_10k = data
        doc_start_pattern = re.compile(r"<DOCUMENT>")
        doc_end_pattern = re.compile(r"</DOCUMENT>")

        type_pattern = re.compile(r"<TYPE>[^\n]+")

        doc_start_is = [x.end() for x in doc_start_pattern.finditer(raw_10k)]
        doc_end_is = [x.start() for x in doc_end_pattern.finditer(raw_10k)]

        doc_types = [x[len("<TYPE>") :] for x in type_pattern.findall(raw_10k)]

        document = {}

        for doc_type, doc_start, doc_end in zip(doc_types, doc_start_is, doc_end_is):
            if doc_type == "10-K":
                document[doc_type] = raw_10k[doc_start:doc_end]
        regex = re.compile(Parser.COMPLETE_REGEX)

        matches = regex.finditer(document["10-K"])
        matched_list = [(x.group(), x.start(), x.end()) for x in matches]
        if len(matched_list) == 0:
            return {}
        df = pd.DataFrame(matched_list)

        df.columns = ["item", "start", "end"]

        df.replace("&#160;", " ", regex=True, inplace=True)
        df.replace("&nbsp;", " ", regex=True, inplace=True)
        df.replace(" ", "", regex=True, inplace=True)
        df.replace("\\.", "", regex=True, inplace=True)
        df.replace(">", "", regex=True, inplace=True)
        df.replace("ITEM", "TEM", regex=True, inplace=True)
        df.replace("TEM", "ITEM", regex=True, inplace=True)
        df.replace("ITEMS", "ITEM", regex=True, inplace=True)
        df.replace("Items", "Item", regex=True, inplace=True)

        remove_rows = []
        for _, row in df.iterrows():
            item_key = str(row["item"])
            if item_key.isupper():
                for key, value in df.iterrows():
                    row_key = str(value["item"])
                    if row_key.lower() == item_key.lower() and not row_key.isupper():
                        remove_rows.append(key)
        df.drop(remove_rows, inplace=True)
        df["item"] = df.item.str.lower()

        pos_df = df.sort_values("start", ascending=True).drop_duplicates(
            subset=["item"], keep="last"
        )
        pos_df.set_index("item", inplace=True)
        document_map = {}
        index_length = len(pos_df.index)
        for index, item in enumerate(pos_df.index):
            if item in Parser.FIELDS:
                if index < index_length - 1:
                    text = document["10-K"][
                        pos_df["start"]
                        .loc[item] : pos_df["start"]
                        .loc[pos_df.index[index + 1]]
                    ]
                else:
                    text = document["10-K"][pos_df["start"].loc[item] :]
                soup = BeautifulSoup(text, parser)
                document_map[item] = {
                    "html": soup.prettify(),
                    "text": soup.get_text("\n\n"),
                }

        return document_map
