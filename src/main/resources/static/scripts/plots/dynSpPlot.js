//Dynamical spectrum plots

function DynSpPlot(id, plotConfig, getDataFromServerFn, onFiltersChangedFn, onPlotReadyFn, toolbar, cssClass, switchable, projectConfig) {

  var currentObj = this;

  PDSPlot.call(this, id, plotConfig, getDataFromServerFn, onFiltersChangedFn, onPlotReadyFn, toolbar, cssClass, switchable, projectConfig);

  this.plotConfig.yAxisType = "linear";
  this.plotConfig.zAxisType = "log";
  this.plotConfig.plotStyle = "3d";
  this.plotConfig.colorScale = { x0: 0.5, y0: 0.5, m: 1.0 };

  this.btnFullScreen.unbind("click").click(function( event ) {
    if (currentObj.$html.hasClass("fullScreen")) {
      currentObj.btnFullScreen.find("i").switchClass( "fa-compress", "fa-arrows-alt");
    } else {
      currentObj.btnFullScreen.find("i").switchClass( "fa-arrows-alt", "fa-compress");
    }
    currentObj.$html.toggleClass("fullScreen");
    currentObj.resize();
  });

  //If plot is pds adds Fits button to plot
  this.btnStyle = $('<button class="btn btn-default btnStyle">2D</button>');
  this.$html.find(".plotTools").prepend(this.btnStyle);
  this.btnStyle.click(function(event){
    if (currentObj.plotConfig.plotStyle == "3d") {
      currentObj.plotConfig.plotStyle = "2d";
      currentObj.btnStyle.html("3D");
      currentObj.settingsPanel.find(".AxisType").hide();
    } else {
      currentObj.plotConfig.plotStyle = "3d";
      currentObj.btnStyle.html("2D");
      currentObj.settingsPanel.find(".AxisType").show();
    }
    currentObj.refreshData();
  });

  this.prepareData = function (data) {

    if (!isNull(data) && data.length == 5) {
      if (this.plotConfig.rebinEnabled && this.plotConfig.rebinSize != 0) {
        try {
          for (pds_idx in data[1].values) {
            var rebinnedData = this.rebinData(data[0].values, data[1].values[pds_idx].values, this.plotConfig.rebinSize, "sum");
            data[0].values = rebinnedData.x;
            data[1].values[pds_idx].values = rebinnedData.y;
          }
        } catch (ex) {
          log("Rebin plot data " + this.id + " error: " + ex);
        }
      } else if (data[0].values.length > 1) {
          this.plotConfig.minRebinSize = data[0].values[1] - data[0].values[0];
          this.plotConfig.maxRebinSize = (data[0].values[data[0].values.length - 1] - data[0].values[0]) / 4;
      }

      if (currentObj.plotConfig.plotType == "X*Y") {
        for (pds_idx in data[1].values) {
          for (i in data[0].values) {
            data[1].values[pds_idx].values[i] = data[1].values[pds_idx].values[i] * data[0].values[i];
          }
        }
      }

      if (data[3].values.length > 0
          && data[3].values[0] > 0) {
        this.plotConfig.duration = data[3].values[0];
      }
    } else {
      this.showWarn("Wrong data received");
    }

    return data;
  }

  this.getLabel = function (axis) {
    if (axis == 2){
      var zLabel = currentObj.plotConfig.styles.labels[2];
      if (currentObj.plotConfig.plotType == "X*Y") {
        if (currentObj.plotConfig.styles.labels[0].startsWith("Freq")
            && currentObj.plotConfig.styles.labels[2].startsWith("Pow")) {
              zLabel = "Power x Frequency (rms/mean)^2";
          } else {
            zLabel += " x " + currentObj.plotConfig.styles.labels[0];
          }
      }
      return zLabel;
    } else {
      return this.plotConfig.styles.labels[axis];
    }
  }

  this.getPlotlyConfig = function (data) {

    var plotlyConfig = null;

    //Creates the plotlyConfig
    if (currentObj.plotConfig.plotStyle == "2d") {

      //ZDATA is an array of arrays with the powers of each time as values
      var z_data=[];
      for (freq_idx in data[0].values) {
        var powers_for_time_data=[];
        for (time_idx in data[2].values) {
          powers_for_time_data.push(data[1].values[time_idx].values[freq_idx]);
        }
        z_data.push(powers_for_time_data);
      }

      plotlyConfig = get_plotdiv_dynamical_spectrum(data[2].values,
                                                      data[0].values,
                                                      z_data,
                                                      this.getLabel(1),
                                                      this.getLabel(0),
                                                      this.getLabel(2),
                                                      this.getColorScale(),
                                                      currentObj.plotConfig.styles.title);
      plotlyConfig.data[0].type = "heatmap";

    } else {

      //ZDATA is a flattened array with the powers
      var z_data=[];
      for (pds_idx in data[1].values) {
        z_data.push(data[1].values[pds_idx].values);
      }

      plotlyConfig = get_plotdiv_dynamical_spectrum(data[0].values,
                                                      data[2].values,
                                                      z_data,
                                                      this.getLabel(0),
                                                      this.getLabel(1),
                                                      this.getLabel(2),
                                                      this.getColorScale(),
                                                      currentObj.plotConfig.styles.title);

      //Set axis type for 3D plot only, log axes not supported on heatmaps
      if (currentObj.plotConfig.xAxisType == "log") {
        plotlyConfig.layout.scene.xaxis.type = 'log';
        plotlyConfig.layout.scene.xaxis.autorange = true;
      }

      if (currentObj.plotConfig.yAxisType == "log") {
        plotlyConfig.layout.scene.yaxis.type = 'log';
        plotlyConfig.layout.scene.yaxis.autorange = true;
      }

      if (currentObj.plotConfig.zAxisType == "log") {
        plotlyConfig.layout.scene.zaxis.type = 'log';
        plotlyConfig.layout.scene.zaxis.autorange = true;
      }

    }

    return plotlyConfig;
  }

  this.getColorScale = function () {
    var numColors = 10;
    var colorscale = [];
    var x0 = this.plotConfig.colorScale.x0;
    var y0 = this.plotConfig.colorScale.y0;
    var m = this.plotConfig.colorScale.m;
    for (i = 0; i <= 1.0; i+=(1.0/numColors)) {
      var c = Math.max(Math.min(Math.floor(255.0 * ((i - y0)*m + x0)), 255), 0);
      var color = 'rgb(' + c + ',0,' + (255 - c) + ')';
      var ratio = "" + fixedPrecision(i, 2);
      colorscale.push([((ratio.length == 1) ? ratio + ".0" : ratio), color]);
    }
    return colorscale;
  }

  this.settingCreated = function(){
    //Creates the color scale controls
    this.colorScale = $('<div class="colorScale">' +
                          '<h3>Color scale:</h3>' +
                          '<canvas class="colorScaleCanvas"></canvas>' +
                        '</div>');

    // Creates the X0 selector
    this.x0Selector = new BinSelector(this.id + "_x0Selector",
                                      "x0:",
                                      "From",
                                      0.0, 1.0, 0.01, 0.5,
                                      this.onX0SelectorValuesChanged);
    this.x0Selector.slider.slider({
           min: this.x0Selector.fromValue,
           max: this.x0Selector.toValue,
           values: [this.x0Selector.value],
           step: this.x0Selector.step,
           slide: function( event, ui ) {
             currentObj.x0Selector.setValues( ui.values[ 0 ], "slider");
             currentObj.onX0SelectorValuesChanged();
           }
       });
    this.x0Selector.inputChanged = function ( event ) {
       currentObj.x0Selector.setValues( getInputFloatValue(currentObj.x0Selector.fromInput, currentObj.x0Selector.value) );
       currentObj.onX0SelectorValuesChanged();
    };
    this.colorScale.append(this.x0Selector.$html);

    // Creates the X0 selector
    this.y0Selector = new BinSelector(this.id + "_y0Selector",
                                      "y0:",
                                      "From",
                                      0.0, 1.0, 0.01, 0.5,
                                      this.onY0SelectorValuesChanged);
    this.y0Selector.slider.slider({
           min: this.y0Selector.fromValue,
           max: this.y0Selector.toValue,
           values: [this.y0Selector.value],
           step: this.y0Selector.step,
           slide: function( event, ui ) {
             currentObj.y0Selector.setValues( ui.values[ 0 ], "slider");
             currentObj.onY0SelectorValuesChanged();
           }
       });
    this.y0Selector.inputChanged = function ( event ) {
       currentObj.y0Selector.setValues( getInputFloatValue(currentObj.y0Selector.fromInput, currentObj.y0Selector.value) );
       currentObj.onY0SelectorValuesChanged();
    };
    this.colorScale.append(this.y0Selector.$html);

    // Creates the X0 selector
    this.mSelector = new BinSelector(this.id + "_mSelector",
                                      "y0:",
                                      "From",
                                      0.0, 1.0, 0.01, 0.25,
                                      this.onMSelectorValuesChanged);
    this.mSelector.slider.slider({
           min: this.mSelector.fromValue,
           max: this.mSelector.toValue,
           values: [this.mSelector.value],
           step: this.mSelector.step,
           slide: function( event, ui ) {
             currentObj.mSelector.setValues( ui.values[ 0 ], "slider");
             currentObj.onMSelectorValuesChanged();
           }
       });
    this.mSelector.inputChanged = function ( event ) {
       currentObj.mSelector.setValues( getInputFloatValue(currentObj.mSelector.fromInput, currentObj.mSelector.value) );
       currentObj.onMSelectorValuesChanged();
    };
    this.colorScale.append(this.mSelector.$html);

    this.settingsPanel.find(".leftCol").append(this.colorScale);
    this.drawColorScale();
  }

  this.onX0SelectorValuesChanged = function(){
    currentObj.plotConfig.colorScale.x0 = currentObj.x0Selector.value;
    currentObj.drawColorScale();
  }

  this.onY0SelectorValuesChanged = function(){
    currentObj.plotConfig.colorScale.y0 = currentObj.y0Selector.value;
    currentObj.drawColorScale();
  }

  this.onMSelectorValuesChanged = function(){
    currentObj.plotConfig.colorScale.m = Math.pow(currentObj.mSelector.value * 4, 3);
    currentObj.drawColorScale();
  }

  this.drawColorScale = function () {
    var canvas = this.colorScale.find(".colorScaleCanvas")[0];
    var context = canvas.getContext('2d');
    var colorscale = this.getColorScale();
    var lineWidth = canvas.width / colorscale.length;

    for (i in colorscale) {
      context.beginPath();
      context.moveTo(lineWidth * i + lineWidth/2, 0);
      context.lineTo(lineWidth * i + lineWidth/2, canvas.height);
      context.lineWidth = lineWidth;
      context.strokeStyle = colorscale[i][1];
      context.stroke();
    }
  }

  this.registerPlotEvents = function () {
    //Dynamical spectrum plot events disabled
  }

  this.getWarnMsg = function (){
    if (this.data != null) {
      if (this.data[4].values.length > 0) {
        return this.data[4].values[0];
      }
    }
    return "";
  }

  this.saveAsCSV = function () {
    var data = currentObj.data;
    if (!isNull(data)){
      var csvContent = "data:text/csv;charset=utf-8,";
      for (time_idx in data[2].values) {
        for (frec_idx in data[0].values) {
          var infoArray = [data[2].values[time_idx], data[0].values[frec_idx], data[1].values[time_idx].values[frec_idx]];
          dataString = Array.prototype.join.call(infoArray, ",");
          csvContent += time_idx < data[2].values.length ? dataString + "\n" : dataString;
        }
      }
      var encodedUri = encodeURI(csvContent);
      var link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", currentObj.plotConfig.styles.title + ".csv");
      link.click();
    }
  }

  log ("new DynSpPlot id: " + this.id);

  return this;
}
