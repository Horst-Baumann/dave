import utils.dave_reader as DaveReader
import utils.plotter as Plotter

from stingray.events import EventList
from stingray import Lightcurve
from stingray.io import load_events_and_gtis

# get_dataset_schema: Returns the schema of a dataset of given file
# the plot inside with a given file destination
#
# @param: destination: file destination
#
def get_dataset_schema(destination):
    dataset = DaveReader.get_file_dataset(destination)
    if dataset:
        return dataset.get_schema()
    else:
        return None


# get_plot_data: Returns the data for a plot
#
# @param: destination: file destination
# @param: filters: array with the filters to apply
#         [{ table = "txt_table", column = "Time", from=0, to=10 }, ... ]
# @param: styles: dictionary with the plot style info
#           { type = "2d", labels=["Time", "Rate Count"]}
# @param: axis: array with the column names to use in ploting
#           [{ table = "txt_table", column = "Time" },
#            { table = "txt_table", column = "Rate" } ... ]
#
def get_plot_data(destination, filters, styles, axis):

    dataset = DaveReader.get_file_dataset(destination)
    filtered_ds = dataset.apply_filters(filters)

    # Config checking
    if "type" not in styles:
        return "No plot type specified on styles"

    if "labels" not in styles:
        return "No plot labels specified on styles"

    if len(styles["labels"]) < 2:
        return "Wrong number of labels specified on styles"

    if len(axis) < 2:
        return "Wrong number of axis"

    # Plot type mode
    if styles["type"] == "2d":
        return Plotter.get_plotdiv_xy(filtered_ds, axis)

    elif styles["type"] == "3d":

        if len(styles["labels"]) < 3:
            return "Wrong number of labels specified on styles"

        if len(axis) < 3:
            return "Wrong number of axis"

        return Plotter.get_plotdiv_xyz(filtered_ds, axis)

    elif styles["type"] == "scatter":
        return Plotter.get_plotdiv_scatter(filtered_ds, axis)

    else:
        return "Wrong plot type specified on styles"


# get_ligthcurve: Returns the data for the Lightcurve
#
# @param: destination: file destination
# @param: filters: array with the filters to apply
#         [{ table = "fits_table", column = "Time", from=0, to=10 }, ... ]
# @param: axis: array with the column names to use in ploting
#           [{ table = "fits_table", column = "TIME" },
#            { table = "fits_table", column = "PI" } ]
# @param: dt: The time resolution of the events.
#
def get_ligthcurve(destination, filters, axis, dt):

    dataset = DaveReader.get_file_dataset(destination)

    if not dataset:
        return None

    filtered_ds = dataset.apply_filters(filters)

    if len(axis) != 2:
        return "Wrong number of axis"

    #time_data = filtered_ds.tables[axis[0]["table"]].columns[axis[0]["column"]].values
    #pi_data = filtered_ds.tables[axis[1]["table"]].columns[axis[1]["column"]].values
    #eventlist = EventList(time_data, pi=pi_data)
    #lc = eventlist.to_lc(dt)

    pi_column = axis[1]["column"]
    data = load_events_and_gtis(destination, additional_columns=[pi_column])
    eventlist = EventList(data.ev_list, pi=data.additional_data[pi_column])
    lc = eventlist.to_lc(dt)

    result = dict()
    result[axis[0]["column"]] = data.ev_list
    result[axis[1]["column"]] = lc.counts

    return result
