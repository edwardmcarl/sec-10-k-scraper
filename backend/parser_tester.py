import os
from parser.parser import Parser, ParserError

from api.connection import APIConnection

conn = APIConnection()
parser = Parser()
company_list = [
    {"name": "Ford", "cik": "CIK0000037996"},
    {"name": "Microsoft", "cik": "CIK0000789019"},
    {"name": "Pfizer", "cik": "CIK0000078003"},
    {"name": "Exxon", "cik": "CIK0000034088"},
    {"name": "Chesapeake", "cik": "CIK0000895126"},
    {"name": "Devon", "cik": "CIK0001090012"},
    {"name": "ConocoPhilips", "cik": "CIK0001163165"},
    {"name": "Tesla", "cik": "CIK0001318605"},
    {"name": "Twitter", "cik": "CIK0001418091"},
    # Add companies you would like to test below
    # {'name': '','cik': ''}, {'name': '','cik': ''},
    # {'name': '','cik': ''}, {'name': '','cik': ''},
]
# Desired storage for output directory. Absolute path
directory = ""
dir_path = os.path.dirname(os.path.realpath(__file__))

if directory == "":
    if not os.path.exists(os.path.join(dir_path, "output")):
        os.mkdir("output")
else:
    if not os.path.exists(os.path.join(directory, "output")):
        os.mkdir(os.path.join(directory, "output"))
for item in company_list:
    cik = item["cik"]
    name = item["name"]
    forms = conn.search_form_info(cik, ["10-K"], "2010-01-01", "2022-04-05")
    filings = forms["filings"]

    for filing in filings:
        report_date = filing["reportDate"]
        fp = open(f"output/{name}_{report_date}.txt", "w")
        document_url = filing["document"]
        parser_document_url = filing["parserDocument"]
        fp.write(f">>>HTML: {document_url}\n")
        fp.write(f">>>PARSER_DOCUMENT: {parser_document_url}\n")
        fp.write("\n")
        try:
            output = parser.parse_document(document_url)
        except ParserError as e:
            if e.message == ParserError.NO_FILE_EXISTS_ERROR:
                fp.close()
                continue
            else:
                raise e
        for key in output:
            fp.write(f">>>SECTION {key}\n\n\n\n")
            fp.write(output[key]["text"])
            fp.write("\n\n")
        fp.close()
