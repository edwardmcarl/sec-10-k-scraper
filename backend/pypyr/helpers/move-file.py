import os
import shutil

from pypyr.context import Context


def run_step(context: Context) -> None:
    context.assert_key_has_value(key="from", caller=__name__)  # assert we have a 'from'
    context.assert_key_has_value(key="to", caller=__name__)  # assert we have a 'to'

    from_directory = os.path.join(
        os.getcwd(), os.path.normpath(context.get_formatted("from"))
    )
    to_directory = os.path.join(
        os.getcwd(), os.path.normpath(context.get_formatted("to"))
    )
    print(from_directory)
    print(to_directory)

    files_to_copy = os.listdir(from_directory)
    print(files_to_copy)

    print(f"Moving files from {from_directory} to {to_directory}")
    if os.path.exists(to_directory):
        shutil.rmtree(to_directory)
    shutil.copytree(from_directory, to_directory)
