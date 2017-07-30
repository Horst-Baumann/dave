//Lightcurve plot

function LcPlot(id, plotConfig, getDataFromServerFn, onFiltersChangedFn, onPlotReadyFn, toolbar, cssClass, switchable) {

  var currentObj = this;

  PlotWithSettings.call(this, id, plotConfig, getDataFromServerFn, onFiltersChangedFn, onPlotReadyFn, toolbar, cssClass, switchable);

  //LC plot attributes:
  this.baselineEnabled = false;

  this.baseline_opts = {};
  this.baseline_opts.lam = { default:1000, min:1, max: 100000}; //Baseline Smoothness ranges
  this.baseline_opts.p = { default:0.01, min:0.001, max: 1}; //Baseline Asymmetry ranges
  this.baseline_opts.niter = { default:10, min:1, max: 1000}; //Baseline N iterations ranges

  //LC plot methods:
  this.addSettingsControls = function(){

    if (this.settingsPanel.find(".baseline").length == 0) {

      var $baseline = $('<div class="baseline">' +
                          '<h3>' +
                            'Draw baseline:' +
                            '<div class="switch-wrapper">' +
                              '<div id="switch_' + this.id + '" class="switch-btn fa fa-plus-square" aria-hidden="true"></div>' +
                            '</div>' +
                          '</h3>' +
                          '<div class="baselineContainer">' +
                            '<p>Smoothness: <input id="lam_' + this.id + '" class="inputLam" type="text" name="lam_' + this.id + '" placeholder="' + this.baseline_opts.lam.default + '" value="' + this.baseline_opts.lam.default + '" /> <span style="font-size:0.8em; color:#777777;">' + this.baseline_opts.lam.min + '-' + this.baseline_opts.lam.max + '</span></p>' +
                            '<p>Asymmetry: <input id="p_' + this.id + '" class="inputP" type="text" name="p_' + this.id + '" placeholder="' + this.baseline_opts.p.default + '" value="' + this.baseline_opts.p.default + '" /> <span style="font-size:0.8em; color:#777777;">' + this.baseline_opts.p.min + '-' + this.baseline_opts.p.max + '</span></p>' +
                            '<p>Nº iterations: <input id="niter_' + this.id + '" class="inputNiter" type="text" name="niter_' + this.id + '" placeholder="' + this.baseline_opts.niter.default + '" value="' + this.baseline_opts.niter.default + '" /> <span style="font-size:0.8em; color:#777777;">' + this.baseline_opts.niter.min + '-' + this.baseline_opts.niter.max + '</span></p>' +
                            '<p style="font-size:0.8em; color:#777777;">Algorithm: Asymmetric Least Squares Smoothing (P. Eilers and H. Boelens, 2005)</p>' +
                          '</div>' +
                        '</div>');

      //Prepares switchBox
      var switchBox = $baseline.find("#switch_" + this.id);
      switchBox.click( function ( event ) {
        currentObj.baselineEnabled = !currentObj.baselineEnabled;
        currentObj.onBaselineValuesChanged();
        if (currentObj.baselineEnabled) {
          $(this).switchClass("fa-plus-square", "fa-minus-square");
          currentObj.settingsPanel.find(".baselineContainer").fadeIn();
        } else {
          $(this).switchClass("fa-minus-square", "fa-plus-square");
          currentObj.settingsPanel.find(".baselineContainer").fadeOut();
        }
      });

      //Prepares input events
      $baseline.find(".baselineContainer").hide();
      $baseline.find("input").on('change', this.onBaselineValuesChanged);

      this.settingsPanel.find(".leftCol").append($baseline);

      this.onSettingsCreated();
    }
  }

  this.onBaselineValuesChanged = function(){
    if (currentObj.baselineEnabled) {
      currentObj.plotConfig.baseline_opts.lam = getInputIntValueCropped(currentObj.settingsPanel.find(".inputLam"), currentObj.plotConfig.baseline_opts.lam, currentObj.baseline_opts.lam.min, currentObj.baseline_opts.lam.max);
      currentObj.plotConfig.baseline_opts.p = getInputFloatValueCropped(currentObj.settingsPanel.find(".inputP"), currentObj.plotConfig.baseline_opts.p, currentObj.baseline_opts.p.min, currentObj.baseline_opts.p.max);
      currentObj.plotConfig.baseline_opts.niter = getInputIntValueCropped(currentObj.settingsPanel.find(".inputNiter"), currentObj.plotConfig.baseline_opts.niter, currentObj.baseline_opts.niter.min, currentObj.baseline_opts.niter.max);
    } else {
      currentObj.disableBaseline();
    }
  }

  this.updateBaselineInputs = function (bsOpts) {
    if (bsOpts.niter > 0) {
      currentObj.settingsPanel.find(".inputLam").val(bsOpts.lam);
      currentObj.settingsPanel.find(".inputP").val(bsOpts.p);
      currentObj.settingsPanel.find(".inputNiter").val(bsOpts.niter);
      currentObj.settingsPanel.find(".baselineContainer").show();
    } else {
      currentObj.settingsPanel.find(".baselineContainer").hide();
    }
  }

  this.disableBaseline = function () {
    currentObj.plotConfig.baseline_opts = { niter: 0 };
  }

  this.getPlotlyConfig = function (data) {
    var coords = currentObj.getSwitchedCoords( { x: 0, y: 1} );
    var plotlyConfig = get_plotdiv_lightcurve(data[0].values, data[1].values,
                                        [], data[2].values,
                                        (data.length > 4) ? currentObj.getWtiRangesFromGtis(data[3].values, data[4].values, data[0].values) : [],
                                        currentObj.plotConfig.styles.labels[coords.x],
                                        currentObj.plotConfig.styles.labels[coords.y],
                                        currentObj.plotConfig.styles.title);

    if (data.length > 5) {
      if (data[5].values.length > 0) {
        //Lightcurve has baseline values
        plotlyConfig.data.push({
                                type : 'scatter',
                                showlegend : false,
                                hoverinfo : 'none',
                                connectgaps : false,
                                x : data[0].values,
                                y : data[5].values,
                                line : {
                                        color : '#DD3333'
                                      }
                              });
      }
    } else {
      currentObj.btnSettings.hide();
    }

    plotlyConfig = currentObj.prepareAxis(plotlyConfig);

    return plotlyConfig;
  }

  this.updateMinMaxCoords = function (){
    if (this.data != null) {
      var coords = this.getSwitchedCoords( { x: 0, y: 1} );
      this.minX = Math.min.apply(null, this.data[coords.x].values);
      this.minY = Math.min.apply(null, this.data[coords.y].values);
      this.maxX = Math.max.apply(null, this.data[coords.x].values);
      this.maxY = Math.max.apply(null, this.data[coords.y].values);

      var tab = getTabForSelector(this.id);
      if (!isNull(tab)){
        tab.updateMinMaxCountRate(this.minY, this.maxY);
      }
    }
  }

  this.getPlotDefaultTracesCount = function (){
      return (currentObj.data.length > 5 && currentObj.data[5].values.length > 0) ? 2 : 1;
  }

  this.mustPropagateAxisFilter = function (axis) {
    return (axis == 1) || this.plotConfig.styles.labels[axis].startsWith(this.plotConfig.axis[axis].column);
  }

  this.getAxisForPropagation = function (axis) {
    if (axis == 1) {
      var propagationAxis =  $.extend({}, this.plotConfig.axis[axis]);
      propagationAxis.column = "RATE";
      return propagationAxis;
    } else {
      return this.plotConfig.axis[axis];
    }
  }

  //LC BaseLine parameters:
  this.disableBaseline();

  log ("new LcPlot id: " + this.id);

  return this;
}
