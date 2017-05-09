import json
import numpy
import utils.exception_helper as ExHelper
import utils.dave_logger as logging

BIG_NUMBER = 9999999999999

class NPEncoder(json.JSONEncoder):
    def default(self, obj):
        try:
            if isinstance(obj, numpy.integer):
                return int(obj)
            elif isinstance(obj, numpy.floating):
                if obj > BIG_NUMBER:
                    return BIG_NUMBER
                if obj < -BIG_NUMBER:
                    return BIG_NUMBER
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
