from test.fixture import *

from hypothesis import given
from hypothesis import example
from hypothesis.strategies import text

import utils.dave_engine as DaveEngine
import utils.file_utils as FileUtils
import utils.dave_reader as DaveReader
import utils.filters_helper as FltHelper

@given(text(min_size=1))
@example("Test_Input_1.txt")
@example("test.evt")
def test_get_dataset_schema(s):
    destination = FileUtils.get_destination(TEST_RESOURCES, s)
    schema = None

    if FileUtils.is_valid_file(destination):
        schema = DaveEngine.get_dataset_schema(destination)
        assert schema is not None


@given(text(min_size=1))
@example("test.evt")
@example("test_Gtis.evt")
def test_get_lightcurve(s):
    destination = FileUtils.get_destination(TEST_RESOURCES, s)
    result = None

    axis = [dict() for i in range(2)]
    axis[0]["table"] = "EVENTS"
    axis[0]["column"] = "TIME"
    axis[1]["table"] = "EVENTS"
    axis[1]["column"] = "PHA"

    baseline_opts = dict()
    baseline_opts["niter"] = 10
    baseline_opts["lam"] = 1000
    baseline_opts["p"] = 0.01

    meanflux_opts = dict()
    meanflux_opts["niter"] = 10
    meanflux_opts["lam"] = 1000
    meanflux_opts["p"] = 0.01

    if FileUtils.is_valid_file(destination):
        result = DaveEngine.get_lightcurve(destination, "", "", [], axis, 16., baseline_opts, meanflux_opts, None)
        assert result is not None


@given(text(min_size=1))
def test_get_divided_lightcurve_ds(s):
    destination = FileUtils.get_destination(TEST_RESOURCES, "Test_Input_2.lc")
    result = ""

    if FileUtils.is_valid_file(destination):
        result = DaveEngine.get_divided_lightcurve_ds(destination, destination, "", "")
        assert len(result) > 0


@given(text(min_size=1))
@example("test.evt")
@example("test_Gtis.evt")
def test_get_power_density_spectrum(s):
    destination = FileUtils.get_destination(TEST_RESOURCES, s)
    result = None

    axis = [dict() for i in range(2)]
    axis[0]["table"] = "EVENTS"
    axis[0]["column"] = "TIME"
    axis[1]["table"] = "EVENTS"
    axis[1]["column"] = "PHA"

    if FileUtils.is_valid_file(destination):
        result = DaveEngine.get_power_density_spectrum(destination, "", "", [], axis, 16., 1, 0, 'leahy', 'Sng')
        assert result is not None


@given(text(min_size=1))
@example("test.evt")
@example("/\x00")
def test_get_cross_spectrum(s):
    destination = FileUtils.get_destination(TEST_RESOURCES, s)
    result = None

    axis = [dict() for i in range(2)]
    axis[0]["table"] = "EVENTS"
    axis[0]["column"] = "TIME"
    axis[1]["table"] = "EVENTS"
    axis[1]["column"] = "PHA"

    if FileUtils.is_valid_file(destination):
        result = DaveEngine.get_cross_spectrum(destination, "", "", [], axis, 16.,
                                               destination, "", "", [], axis, 16.,
                                               1, 0, 'leahy', 'Avg')
        assert result is not None
