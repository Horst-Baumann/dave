import json
import numpy
import utils.exception_helper as ExHelper
import utils.dave_logger as logging
from config import CONFIG


class NPEncoder(json.JSONEncoder):

    """Minify JSON output."""
    item_separator = ','
    key_separator = ':'

    def default(self, obj):
        try:
            if isinstance(obj, int):
                if obj > CONFIG.BIG_NUMBER:
                    return CONFIG.BIG_NUMBER
                if obj < -CONFIG.BIG_NUMBER:
                    return -CONFIG.BIG_NUMBER
                return int(obj)
            elif isinstance(obj, float):
                if obj > CONFIG.BIG_NUMBER:
                    return CONFIG.BIG_NUMBER
                if obj < -CONFIG.BIG_NUMBER:
                    return -CONFIG.BIG_NUMBER
                return float(obj)
            if isinstance(obj, numpy.integer):
                if obj > CONFIG.BIG_NUMBER:
                    return CONFIG.BIG_NUMBER
                if obj < -CONFIG.BIG_NUMBER:
                    return -CONFIG.BIG_NUMBER
                return int(obj)
            elif isinstance(obj, numpy.floating):
                if obj > CONFIG.BIG_NUMBER:
                    return CONFIG.BIG_NUMBER
                if obj < -CONFIG.BIG_NUMBER:
                    return -CONFIG.BIG_NUMBER
                return float(obj)
            elif isinstance(obj, complex):
                return self.default(numpy.real(obj))
            elif isinstance(obj, numpy.ndarray):
                return obj.tolist()
            else:
                return super(NPEncoder, self).default(obj)
        except:
            logging.error(ExHelper.getException('NPEncoder'))
            return None
