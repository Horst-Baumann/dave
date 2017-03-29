import numpy as np
import utils.dave_logger as logging


def get_plotdiv_xy(dataset, axis):
    data = build_data_list(dataset, axis)
    return data


def get_plotdiv_xyz(dataset, axis):
    data = build_data_list(dataset, axis)

    color_array = np.random.uniform(-5, 5, size=len(data[0]["values"]))
    color_data = dict()
    color_data["values"] = color_array
    data = np.append(data, [color_data])

    ramdom_values = np.random.uniform(-8, 8, size=len(data[0]["values"]))
    data[2]["error_values"] = ramdom_values

    return data


def get_plotdiv_scatter(dataset, axis):
    data = build_data_list(dataset, axis)
    amplitude_array = np.random.uniform(-5, 5, size=len(data[0]["values"]))
    amplitude_data = dict()
    amplitude_data["values"] = amplitude_array
    data = np.append(data, [amplitude_data])

    return data


def build_data_list(dataset, axis):
    axis = get_axis_with_gtis(axis)
    data = []
    for i in range(len(axis)):
        table_name = axis[i]["table"]
        if table_name in dataset.tables:
            column_name = axis[i]["column"]
            if column_name in dataset.tables[table_name].columns:
                column = dataset.tables[table_name].columns[column_name]
                column_data = dict()
                column_data["values"] = column.values
                column_data["error_values"] = column.error_values
                data = np.append(data, [column_data])
            else:
                logging.error("Accessing unknown column: %s" % column_name)
        else:
            logging.error("Accessing unknown table: %s" % table_name)
    return data

def get_axis_with_gtis (axis):
    for i in range(len(axis)):
        # If TIME in axis append GTIs
        if axis[i]["table"] in ["EVENTS", "RATE"] and axis[i]["column"] == "TIME":
            axis = np.append(axis, [{"table":"GTI", "column":"START"}])
            axis = np.append(axis, [{"table":"GTI", "column":"STOP"}])
    return axis
