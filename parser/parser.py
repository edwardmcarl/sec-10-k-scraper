from typing import List, Dict
from bs4 import BeautifulSoup
import re

class ParserError(Exception):
    PARSER_TOOL_NOT_SUPPORTED = 'Specified parser tool not supported'
    DOCUMENT_NOT_SUPPORTED = 'Parsing for this document is not supported'

    def __init__(self, message: str, *values: object) -> None:
        self.message = message
        super().__init__(self.message)

class Parser:
    HTML5LIB = 0
    HTML_PARSER = 1
    LXML = 2
    FIELDS = ['Item 1', 'Item 1A', 'Item 2', ' Item 3', 'Item 6', 'Item 7', 'Item 7A',
                'Item 10', 'Item 12', 'Item 13']

    def __init__(self) -> None:
        self.soup = None
        pass

    def parse_document(self, document_url: str, parser_tool: int = HTML_PARSER) -> None:
        if parser_tool == Parser.HTML5LIB:
            parser = 'html5lib'
        elif parser_tool == Parser.HTML_PARSER:
            parser = 'html.parser'
        elif parser_tool == Parser.LXML:
            parser = 'lxml'
        else:
            raise ParserError(ParserError.PARSER_TOOL_NOT_SUPPORTED, parser)
        
        if not (document_url.endswith('.htm') or document_url.endswith('.html') or document_url.endswith('.xml')):
            raise ParserError(ParserError.DOCUMENT_NOT_SUPPORTED, document_url)

        with open(document_url) as fp:
            self.soup = BeautifulSoup(fp, parser)

    def _extract_tag(self, content: str):
        def filter(tag):
            return re.compile(content).search(tag)
        return filter

    def extract_fields(self, fields: List[str] = FIELDS) -> Dict[str, str]:
        for i, field in enumerate(fields):
            fields[i] = f"{field.strip()}."