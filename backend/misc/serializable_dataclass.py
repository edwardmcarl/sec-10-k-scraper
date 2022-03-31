from typing import Callable, Dict, List, TypeVar, Union

from mashumaro import DataClassDictMixin

DictableDataClass = TypeVar("DictableDataClass", bound=DataClassDictMixin)


def remotely_callable_returns_dataclass(
    func: Callable[..., Union[DictableDataClass, List[DictableDataClass], None]]
):
    """
    Annotation to be used on functions *THAT WILL BE CALLED BY THE FRONTEND*
    which return (lists of) dataclasses that inherit from mashumaro's
    DictableDataClass. Makes the function compatible with zerorpc by turning
    its return value into a properly serializable dict.
    """

    def dataclass_func(*args, **kwargs):
        def dictify_data(val: Union[DictableDataClass, List[DictableDataClass], Dict]):
            if isinstance(val, list):
                return [dictify_data(element) for element in val]
            if isinstance(val, DataClassDictMixin):
                return val.to_dict()
            if isinstance(val, dict):  # check for an empty dict
                if not val:
                    return val
            if val is None:
                return None
            # runtime error, just in case
            raise Exception(
                "Attempted to dictify an object that was neither a DictableDataClass, a List[DictableDataClass], nor empty"
            )

        dataclass_result = func(*args, **kwargs)
        return dictify_data(dataclass_result)

    return dataclass_func
