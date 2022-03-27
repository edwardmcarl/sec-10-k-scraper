# Reason for escaping mypy type check: https://bugs.launchpad.net/beautifulsoup/+bug/1843791
# Can create a 'stublist' but wanted to get this commit first
import re
from typing import Dict

import pandas as pd # type: ignore
import requests # type: ignore
from bs4 import BeautifulSoup  # type: ignore


class ParserError(Exception):
    PARSER_TOOL_NOT_SUPPORTED = "Specified parser tool not supported"
    DOCUMENT_NOT_SUPPORTED = "Parsing for this document is not supported"
    SERVER_ERROR = "The SEC EDGAR server could not process the request"
    CONNECTION_ERROR = "The application failed to reach the server"

    def __init__(self, message: str, *values: object) -> None:
        self.message = message
        super().__init__(self.message)


class Parser:
    HTML5LIB = 0
    HTML_PARSER = 1
    LXML = 2
    FIELD_REGEX = r"((>(I){0,1}(tem|TEM)(\s|&#160;|&nbsp;)|ITEM(\s|&#160;|&nbsp;))(1|1A|2|3|4|5|6|7|7A|8|9|9A|9B|10|11|12|13|14|15))\.{0,1}"
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
    ) -> Dict[str, str]:

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

        req = requests.get(document_url)
        if req.status_code >= 400 and req.status_code < 500:
            raise ParserError(ParserError.CONNECTION_ERROR)
        elif req.status_code >= 500:
            raise ParserError(ParserError.SERVER_ERROR)

        raw_10k = req.text
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
        regex = re.compile(Parser.FIELD_REGEX)

        matches = regex.finditer(document["10-K"])

        test_df = pd.DataFrame([(x.group(), x.start(), x.end()) for x in matches])

        test_df.columns = ["item", "start", "end"]
        test_df["item"] = test_df.item.str.lower()

        test_df.replace("&#160;", " ", regex=True, inplace=True)
        test_df.replace("&nbsp;", " ", regex=True, inplace=True)
        test_df.replace(" ", "", regex=True, inplace=True)
        test_df.replace("\\.", "", regex=True, inplace=True)
        test_df.replace(">", "", regex=True, inplace=True)
        test_df.replace("tem", "item", regex=True, inplace=True)

        pos_dat = test_df.sort_values("start", ascending=True).drop_duplicates(
            subset=["item"], keep="last"
        )
        pos_dat.set_index("item", inplace=True)
        document_map = {}
        index_length = len(pos_dat.index)
        for index, item in enumerate(pos_dat.index):
            if item in Parser.FIELDS:
                if index < index_length - 1:
                    text = document["10-K"][
                        pos_dat["start"]
                        .loc[item] : pos_dat["start"]
                        .loc[pos_dat[index + 1]]
                    ]
                else:
                    text = document["10-K"][pos_dat["start"].loc[item] :]
                document_map[item] = BeautifulSoup(text, parser).get_text("\n\n")

        return document_map
