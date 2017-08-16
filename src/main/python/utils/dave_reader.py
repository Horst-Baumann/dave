
import os
import utils.dave_logger as logging
import magic

import model.dataset as DataSet
import numpy as np
from astropy.io import fits

from hendrics.io import load_events_and_gtis
from stingray.gti import _get_gti_from_extension
from hendrics.lcurve import lcurve_from_fits
from hendrics.io import load_data

import utils.dataset_cache as DsCache

timecolumn='TIME'
gtistring='GTI,STDGTI,STDGTI04'

def get_cache_key_for_destination (destination, time_offset):
    if os.path.isfile(destination):
        # If destination is a valid file, so is not a cache key
        return DsCache.get_key(destination + "|" + str(time_offset))
    else:
        return destination # If destination is a cache key


def get_file_dataset(destination, time_offset=0):

    if not destination:
        return None

    cache_key = get_cache_key_for_destination(destination, time_offset)
    if DsCache.contains(cache_key):
        logging.debug("get_file_dataset: returned cached dataset, cache_key: " + str(cache_key))
        return DsCache.get(cache_key)

    logging.debug("get_file_dataset: reading destination: " + str(destination))
    filename = os.path.splitext(destination)[0]
    file_extension_from_file = os.path.splitext(destination)[1]
    file_extension = magic.from_file(destination)
    logging.debug("File extension: %s" % file_extension)

    dataset = None

    if file_extension.find("ASCII") == 0:

        table_id = "EVENTS"
        header_names = ["TIME", "PHA", "Color1", "Color2"]
        dataset = get_txt_dataset(destination, table_id, header_names)

        table = dataset.tables[table_id]
        table.add_columns(["AMPLITUDE"])
        numValues = len(table.columns["TIME"].values)
        random_values = np.random.uniform(-1, 1, size=numValues)
        table.columns["AMPLITUDE"].values = random_values

    elif file_extension.find("FITS") == 0:

        # Opening Fits
        hdulist = fits.open(destination, memmap=True)
        dataset = None

        if 'EVENTS' in hdulist:
            # If EVENTS extension found, consider the Fits as EVENTS Fits
            dataset = get_events_fits_dataset_with_stingray(destination, hdulist, dsId='FITS',
                                               hduname='EVENTS', column=timecolumn,
                                               gtistring=gtistring, extra_colums=['PI', "PHA"], time_offset=time_offset)

        elif 'RATE' in hdulist:
            # If RATE extension found, consider the Fits as LIGHTCURVE Fits
            dataset = get_lightcurve_fits_dataset_with_stingray(destination, hdulist, hduname='RATE',
                                                        column=timecolumn, gtistring=gtistring, time_offset=time_offset)

        elif 'EBOUNDS' in hdulist:
            # If EBOUNDS extension found, consider the Fits as RMF Fits
            dataset = get_fits_dataset(hdulist, "RMF", ["EBOUNDS"])

        elif len(set(gtistring.split(",")).intersection(set(hdulist))):
            # If not EVENTS or RATE extension found, check if is GTI Fits
            dataset = get_gti_fits_dataset_with_stingray(hdulist,gtistring=gtistring, time_offset=time_offset)

        else:
            logging.error("Unsupported FITS type!")

    elif file_extension == "data" and (file_extension_from_file in [".p", ".nc"]):

        # If file is pickle object, tries to parse it as dataset
        dataset = load_dataset_from_intermediate_file(destination)

    else:
        logging.error("Unknown file extension: " + str(file_extension) + " , " + str(file_extension_from_file))

    if dataset:
        DsCache.add(cache_key, dataset)

    return dataset


def get_txt_dataset(destination, table_id, header_names):

    data = np.loadtxt(destination)
    dataset = DataSet.get_hdu_type_dataset(table_id, header_names, hduname="EVENTS")

    # Column1, Column1Err, Column2, Column2Err .. header order expected
    for i in range(len(header_names)):
        header_name = header_names[i]
        column = dataset.tables[table_id].columns[header_name]
        column.values = data[0:len(data), i * 2]
        column.error_values = data[0:len(data), (i * 2) + 1]

    logging.debug("Read txt file successfully: %s" % destination)

    return dataset


# Returns a dataset by reading a Fits file, returns all tables
def get_fits_dataset(hdulist, dsId, table_ids):
    dataset = DataSet.get_empty_dataset(dsId)

    for t in range(len(hdulist)):
        if isinstance(hdulist[t], fits.hdu.table.BinTableHDU):
            if hdulist[t].name in table_ids:
                table_id = hdulist[t].name

                header_names = hdulist[t].columns.names
                tbdata = hdulist[t].data
                dataset.add_table(table_id, header_names)

                header, header_comments = get_header(hdulist, table_id)
                dataset.tables[table_id].set_header_info(header, header_comments)

                for i in range(len(header_names)):
                    header_name = header_names[i]
                    dataset.tables[table_id].columns[header_name].add_values(np.nan_to_num(tbdata.field(i)))
            else:
                logging.warn("Ignored table data: %s" % hdulist[t].name)
        else:
            logging.warn("No valid data on: %s" % t)
            logging.warn("Type of Data: %s" % type(hdulist[t]))

    hdulist.close()

    logging.debug("Read fits file successfully: %s" % dsId)

    return dataset


# Returns the column's names of a given table of Fits file
def get_fits_table_column_names(hdulist, table_id):

    if table_id in hdulist:
        if isinstance(hdulist[table_id], fits.hdu.table.BinTableHDU):
            return hdulist[table_id].columns.names

    return None


# Returns a dataset containin HDU table and GTI table
# with the Fits data using Stingray library
def get_events_fits_dataset_with_stingray(destination, hdulist, dsId='FITS',
                                   hduname='EVENTS', column=timecolumn,
                                   gtistring='GTI,STDGTI', extra_colums=[], time_offset=0):

    # Gets columns from fits hdu table
    logging.debug("Reading Events Fits columns")
    columns = get_fits_table_column_names(hdulist, hduname)

    header, header_comments = get_header(hdulist, hduname)

    # Closes the FITS file, further file data reads will be done via Stingray
    hdulist.close()

    # Prepares additional_columns
    additional_columns = []
    for i in range(len(columns)):
        if columns[i] != column:
            if len(extra_colums) == 0 or columns[i] in extra_colums:
                additional_columns.append(columns[i])

    # Reads fits data
    logging.debug("Reading Events Fits columns's data")
    fits_data = load_events_and_gtis(destination,
                                     additional_columns=additional_columns,
                                     gtistring=gtistring,
                                     hduname=hduname, column=column)

    event_list, events_start_time = substract_tstart_from_events(fits_data, time_offset)

    dataset = DataSet.get_dataset_applying_gtis(dsId, header, header_comments,
                                                fits_data.additional_data, [],
                                                event_list.time, [],
                                                event_list.gti[:, 0], event_list.gti[:, 1],
                                                 None, None, hduname, column)

    # Stores the events_start_time in time column extra
    dataset.tables[hduname].columns[column].set_extra("TSTART", events_start_time)

    logging.debug("Read Events fits with stingray file successfully: " + str(destination) + ", tstart: " + str(events_start_time))

    return dataset


# Returns a dataset containing GTI table using Stingray library
def get_gti_fits_dataset_with_stingray(hdulist, gtistring='GTI,STDGTI', time_offset=0):
    st_gtis = _get_gti_from_extension(hdulist, gtistring)
    if time_offset != 0:
        st_gtis[:, 0] = st_gtis[:, 0] - time_offset
        st_gtis[:, 1] = st_gtis[:, 1] - time_offset
    return DataSet.get_gti_dataset_from_stingray_gti(st_gtis)


# Returns a dataset containin LIGHTCURVE table and GTI table
# with the Fits data using Stingray library
def get_lightcurve_fits_dataset_with_stingray(destination, hdulist, hduname='RATE',
                                            column=timecolumn, gtistring='GTI,STDGTI', time_offset=0):

    #Check if HDUCLAS1 = LIGHTCURVE column exists
    logging.debug("Reading Lightcurve Fits columns")
    if "HDUCLAS1" not in hdulist[hduname].header:
        logging.warn("HDUCLAS1 not found in header: " + hduname)
        return None

    elif hdulist[hduname].header["HDUCLAS1"] != "LIGHTCURVE":
        logging.warn("HDUCLAS1 is not LIGHTCURVE")
        return None

    header, header_comments = get_header(hdulist, hduname)

    # Reads the lightcurve with HENDRICS
    outfile = lcurve_from_fits(destination, gtistring=gtistring,
                             timecolumn=column, ratecolumn=None, ratehdu=1,
                             fracexp_limit=0.9)[0]

    lcurve, events_start_time = substract_tstart_from_lcurve(load_data(outfile), time_offset)

    dataset = DataSet.get_lightcurve_dataset_from_stingray_lcurve(lcurve, header, header_comments,
                                                                    hduname, column)

    # Stores the events_start_time in time column extra
    dataset.tables[hduname].columns[column].set_extra("TSTART", events_start_time)

    logging.debug("Read Lightcurve fits with stingray file successfully: " + str(destination) + ", tstart: " + str(events_start_time))

    return dataset


def substract_tstart_from_events(fits_data, time_offset=0):
    # Adds the lag of the first event to the start time of observation
    if time_offset == 0:
        events_start_time = fits_data.t_start
    else:
        events_start_time = fits_data.t_start - (fits_data.t_start - time_offset)

    event_list = fits_data.ev_list
    event_list.gti[:, 0] = event_list.gti[:, 0] - events_start_time
    event_list.gti[:, 1] = event_list.gti[:, 1] - events_start_time
    event_list.time = event_list.time - events_start_time

    return event_list, fits_data.t_start


def substract_tstart_from_lcurve(lcurve, time_offset=0):
    # Gets start time of observation and substract it from all time data,
    # sure this can be done on lcurve_from_fits, but I consider this is cleaner
    events_start_time = 0
    real_start_time = 0
    if "tstart" in lcurve:
        real_start_time = lcurve["tstart"]

        if time_offset == 0:
            events_start_time = real_start_time
        else:
            events_start_time = real_start_time - (real_start_time - time_offset)

        lcurve["time"] = lcurve["time"] - events_start_time
        lcurve["gti"][:, 0] = lcurve["gti"][:, 0] - events_start_time
        lcurve["gti"][:, 1] = lcurve["gti"][:, 1] - events_start_time
    else:
        logging.warn("TSTART not readed from lightcurve Fits")

    return lcurve, real_start_time


# Gets FITS header properties
def get_header(hdulist, hduname):
    header = dict()
    header_comments = dict()
    for header_column in hdulist[hduname].header:
        header[header_column] = str(hdulist[hduname].header[header_column])
        header_comments[header_column] = str(hdulist[hduname].header.comments[header_column])

    return header, header_comments


def get_stingray_object(destination, time_offset=0):

    if not destination:
        return None

    filename = os.path.splitext(destination)[0]
    file_extension = magic.from_file(destination)
    logging.debug("File extension: %s" % file_extension)

    if file_extension.find("FITS") == 0:

        # Opening Fits
        hdulist = fits.open(destination, memmap=True)

        if 'EVENTS' in hdulist:
            # If EVENTS extension found, consider the Fits as EVENTS Fits
            fits_data = load_events_and_gtis(destination,
                                             additional_columns=['PI', "PHA"],
                                             gtistring=gtistring,
                                             hduname='EVENTS', column=timecolumn)
            return substract_tstart_from_events(fits_data, time_offset)

        elif 'RATE' in hdulist:
            # If RATE extension found, consider the Fits as LIGHTCURVE Fits
            # Reads the lightcurve with maltpynt
            outfile = lcurve_from_fits(destination, gtistring=gtistring,
                                     timecolumn=timecolumn, ratecolumn=None, ratehdu=1,
                                     fracexp_limit=0.9)[0]
            return substract_tstart_from_lcurve(load_lcurve(outfile), time_offset)

        else:
            logging.error("Unsupported FITS type!")

    else:
        logging.error("Unknown file extension: %s" % file_extension)
        return None


def save_to_intermediate_file(stingray_object, fname):
    """Save Stingray object to intermediate file."""
    from stingray.lightcurve import Lightcurve
    from stingray.events import EventList
    from stingray.crossspectrum import Crossspectrum
    from hendrics.io import save_lcurve, save_events, save_pds
    if isinstance(stingray_object, Lightcurve):
        save_lcurve(stingray_object, fname)
    elif isinstance(stingray_object, EventList):
        save_events(stingray_object, fname)
    # This also work for Powerspectrum and AveragedCrosspowerspectrum, clearly
    elif isinstance(stingray_object, Crossspectrum):
        save_pds(stingray_object, fname)
    else:
        logging.error("save_to_intermediate_file: Unknown object type: %s" % type(stingray_object).__name__)
        return False

    return True


def load_dataset_from_intermediate_file(fname):
    """Save Stingray object to intermediate file."""

    from stingray.lightcurve import Lightcurve
    from stingray.events import EventList
    from stingray.crossspectrum import Crossspectrum
    from hendrics.io import get_file_type

    ftype, contents = get_file_type(fname)
    # This will return an EventList, a light curve, a Powerspectrum, ...
    # depending on the contents of the file

    if isinstance(contents, Lightcurve):
        return DataSet.get_lightcurve_dataset_from_stingray_Lightcurve(contents)

    elif isinstance(contents, EventList):
        return DataSet.get_eventlist_dataset_from_stingray_Eventlist(contents)

    # This also work for Powerspectrum and AveragedCrosspowerspectrum, clearly
    elif isinstance(contents, Crossspectrum):
        logging.error("Unsupported intermediate file type: Crossspectrum")

    else:
        logging.error("Unsupported intermediate file type: %s" % type(stingray_object).__name__)

    return None
