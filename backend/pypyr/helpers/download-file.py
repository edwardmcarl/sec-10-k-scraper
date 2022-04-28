import shutil
from pathlib import Path
from urllib.request import urlopen

from pypyr.context import Context

MODEL_DOWNLOAD_URL = "https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.2.0/en_core_web_sm-3.2.0.tar.gz"


def run_step(context: Context) -> None:
    context.assert_key_has_value(key="url", caller=__name__)  # assert we have a 'url'
    context.assert_key_has_value(
        key="to_file", caller=__name__
    )  # assert we have a 'to_file'

    from_url = context.get_formatted_as_type("url", str)
    to_path = Path(Path.cwd(), Path(context.get_formatted("to_file")))
    # create parent dir if it doesn't exist
    to_path.parent.mkdir(parents=True, exist_ok=True)
    print(f"Downloading file from: {from_url}")
    print(f"Will write to: {to_path}")
    with urlopen(context.get_formatted("url")) as res, open(to_path, "wb") as out:
        shutil.copyfileobj(res, out)
    print("Done!")
