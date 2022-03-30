from typing import Callable

from mashumaro import DataClassDictMixin


def returns_serializable_dataclass(func: Callable[..., DataClassDictMixin]):
    """
    Annotation to be used on functions which return dataclasses
    that inherit from mashumaro's DataClassDictMixin. Makes the
    function compatible with zerorpc by turning its return value
    into a properly serializable dict.
    """

    def dataclass_func(*args, **kwargs):
        dataclass_result = func(*args, **kwargs)
        return dataclass_result.to_dict()

    return dataclass_func
