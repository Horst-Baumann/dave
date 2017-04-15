
function ProjectConfig(){
  this.filename = "";
  this.filenames = [];
  this.schema = null;
  this.bckFilename = "";
  this.bckFilenames = [];
  this.gtiFilename = "";
  this.gtiFilenames = [];
  this.rmfFilename = "";
  this.arfFilename = "";
  this.selectorFilenames = [];
  this.binSize = 0;
  this.minBinSize = 0;
  this.avgSegmentSize = 0;
  this.timeUnit = "s";
  this.totalDuration = 0;
  this.plots = [];

  this.hasSchema = function (schema) {
    return this.schema != null;
  }

  this.setSchema = function (schema) {

    this.schema = schema;

    var tableHeader = null;
    var table = null;

    if (!isNull(schema["EVENTS"])) {
        table = schema["EVENTS"];
    } else if (!isNull(schema["RATE"])) {
        table = schema["RATE"];
    }

    if (!isNull(table)) {

      if (!isNull(table["HEADER"])) {
        tableHeader = table["HEADER"];
      }

      if (!isNull(tableHeader)) {

          // Sets the time unit
          if (!isNull(tableHeader["TUNIT1"])) {
            this.timeUnit = tableHeader["TUNIT1"];
          }

          // Sets the time resolution
          if (!isNull(tableHeader["TIMEDEL"])) {
            this.binSize = parseFloat(tableHeader["TIMEDEL"]);
          }

          // Sets the minimun resolution
          if (!isNull(tableHeader["FRMTIME"])) {
            this.minBinSize = parseInt(tableHeader["FRMTIME"]) / 1000;
          } else {
            this.minBinSize = this.binSize;
          }

          // Sets the total duration
          if (!isNull(tableHeader["TSTART"])
              && !isNull(tableHeader["TSTOP"])) {

            var start = parseInt(tableHeader["TSTART"]);
            var stop = parseInt(tableHeader["TSTOP"]);
            this.totalDuration = stop - start;

          } else if (!isNull(tableHeader["TSTARTI"])
                      && !isNull(tableHeader["TSTOPI"])
                      && !isNull(tableHeader["TSTARTF"])
                      && !isNull(tableHeader["TSTOPF"])) {

            var start = parseInt(tableHeader["TSTARTI"]) + parseFloat(tableHeader["TSTARTF"]);
            var stop = parseInt(tableHeader["TSTOPI"]) + parseFloat(tableHeader["TSTOPF"]);
            this.totalDuration = stop - start;
          }
      }
    }

    //Sets the segment size for spectrums
    this.avgSegmentSize = this.minBinSize;
    if (!isNull(schema["GTI"])) {
      var gtiTable = schema["GTI"];
      if (!isNull(gtiTable["START"])
          && !isNull(gtiTable["STOP"])) {
        if (gtiTable["START"].count > 1) {
          //If there are more than one gti then get segmSize from avg gti size
          this.avgSegmentSize = gtiTable["STOP"].avg_value - gtiTable["START"].avg_value;
        } else {
          //Else set segmSize from splitting totalDuration by 30
          this.avgSegmentSize = this.totalDuration / 30;
        }
      }
    }
  }

  this.setFiles = function (selectorKey, filenames, filename) {
    if (selectorKey == "SRC") {
      this.filenames = filenames;
      this.filename = filename;
    } else if (selectorKey == "BCK") {
      this.bckFilenames = filenames;
      this.bckFilename = filename;
    } else if (selectorKey == "GTI") {
      this.gtiFilenames = filenames;
      this.gtiFilename = filename;
    } else if (selectorKey == "RMF") {
      this.rmfFilename = filename;
    } else if (selectorKey == "ARF") {
      this.arfFilename = filename;
    }
  }

  this.setFile = function (selectorKey, filename) {
    this.selectorFilenames[selectorKey] = filename;
  }

  this.getFile = function (selectorKey, filename) {
    if (!isNull(this.selectorFilenames[selectorKey])) {
      return this.selectorFilenames[selectorKey];
    }
    return "";
  }

  this.updateFromProjectConfigs = function (projectConfigs) {
    for (i in projectConfigs) {
      this.totalDuration = (this.totalDuration != 0) ? Math.min(this.totalDuration, projectConfigs[i].totalDuration) : projectConfigs[i].totalDuration;
      this.minBinSize = (this.minBinSize != 0) ? Math.max(this.minBinSize, projectConfigs[i].minBinSize) : projectConfigs[i].minBinSize;
      this.binSize = (this.binSize != 0) ? Math.max(this.binSize, projectConfigs[i].binSize) : projectConfigs[i].binSize;
      this.avgSegmentSize = (this.avgSegmentSize != 0) ? Math.min(this.avgSegmentSize, projectConfigs[i].avgSegmentSize) : projectConfigs[i].avgSegmentSize;
    }

    this.binSize = Math.max(this.binSize, this.minBinSize);
  }
}
