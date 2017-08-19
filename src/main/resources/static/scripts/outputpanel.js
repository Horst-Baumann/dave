function OutputPanel (id, classSelector, container, service, onFiltersChangedFromPlotFn, getFiltersFn) {

  var currentObj = this;

  this.id = id;
  this.classSelector = classSelector;
  this.service = service;
  this.onFiltersChangedFromPlot = onFiltersChangedFromPlotFn;
  this.getFilters = getFiltersFn;
  this.$html = cloneHtmlElement(id, classSelector);
  container.html(this.$html);
  this.$html.show();
  this.$btnShowToolbar = this.$html.find(".btnShowToolbar");
  this.$btnHideToolbar = this.$html.find(".btnHideToolbar");
  this.$toolBar = this.$html.find(".outputPanelToolBar");
  this.$body =  this.$html.find(".outputPanelBody");
  this.plots = [];
  this.infoPanel = null;
  this.showBlockingLoadDialog = false;

  //METHODS AND EVENTS

  this.$btnShowToolbar.click(function(event){
     currentObj.$btnShowToolbar.hide();
     currentObj.$toolBar.show();
  });

  this.$btnHideToolbar.click(function(event){
     currentObj.$toolBar.hide();
     currentObj.$btnShowToolbar.show();
  });

  this.$btnShowToolbar.hide();
  this.$toolBar.hide();

  this.setAnalisysSections = function (sections) {
    this.$toolBar.find(".container").html("");
    for (i in sections) {
      this.addToolbarSection(sections[i]);
    };
  }

  this.addToolbarSection = function (section) {
    var $section = $('<div class="Section ' + section.cssClass + '">' +
                      '<h3>' + section.title + ':</h3>' +
                      '<div class="sectionContainer">' +
                      '</div>' +
                    '</div>');
    $section.hide();
    this.$toolBar.find(".container").append($section);
  }

  this.setToolbarSectionVisible = function (sectionClass, visible) {
    if (visible) {
        currentObj.$html.find(".Section." + sectionClass).show();
    } else {
        currentObj.$html.find(".Section." + sectionClass).hide();
    }
  }

  this.setEnabledSection = function (sectionClass, enabled) {
    var plots = currentObj.$html.find(".plotContainer." + sectionClass);
    if (plots.length > 0) {
      currentObj.setToolbarSectionVisible(sectionClass, enabled);
      $.each( plots, function(i, $plot) {
        var plot = currentObj.getPlotById($plot.id);
        if (!isNull(plot) && plot.isVisible){
          setVisibility(plot.$html, enabled);
          if (enabled) {
            plot.refreshData();
          }
        }
      });
    }
  }

  this.initPlots = function(projectConfig) {
    //PLOTS HARDCODED BY THE MOMENT HERE
    if (projectConfig.schema.isLightCurveFile()) {

      //If fits is a Lightcurve
      if (projectConfig.plots.length == 0) {
        this.addLightcurveAndPdsPlots ("SRC",
                                      projectConfig.filename, "", "",
                                      "RATE", "RATE", projectConfig,
                                      "fullWidth", false);
      }

      this.plots = projectConfig.plots;

    } else {

      //If fits is an Events fits
      this.plots = this.getFitsTablePlots(projectConfig.filename,
                                          projectConfig.bckFilename,
                                          projectConfig.gtiFilename,
                                          projectConfig.timeUnit,
                                          projectConfig);
    }

    //ADDS PLOTS TO PANEL
    for (i in this.plots) {
      this.$body.append(this.plots[i].$html);
      if (i >= CONFIG.INITIAL_VISIBLE_PLOTS) {
        this.plots[i].hide();
      }
    };
    this.forceResize();
    this.enableDragDrop(false);
    this.$btnShowToolbar.show();

    setTimeout( function () {
      //Forces check if all plots visible are ready.
      //If all plots are hidden no PlotReady event is rised from plots
      currentObj.onPlotReady();
    }, 2500);

  };

  this.resize = function() {
    for (i in this.plots) { this.plots[i].resize(); };
  }

  this.forceResize = function () {
    $(window).trigger("resize");
  }

  this.onDatasetChanged = function ( projectConfig ) {

    // Clears output panel
    this.$body.html("");

    // Adds plots
    this.initPlots(projectConfig);

    // Adds FITS info if found
    if (projectConfig.schema.isEventsFile()) {
      this.addInfoPanel( "EVENTS", projectConfig.schema.contents );
    } else if (projectConfig.schema.isLightCurveFile()) {
      this.addInfoPanel( "RATE", projectConfig.schema.contents );
    }
  }

  this.addInfoPanel = function ( tableName, schema ) {
    if (!isNull(schema[tableName]["HEADER"])) {
      this.infoPanel = new InfoPanel(this.generatePlotId("infoPanel"), "Header File Information", schema[tableName]["HEADER"], schema[tableName]["HEADER_COMMENTS"], this.$toolBar);
      this.$body.append(this.infoPanel.$html);
    }
  }

  this.onDatasetValuesChanged = function ( filters ) {
    if (this.showBlockingLoadDialog){
      waitingDialog.show('Retrieving plots data...');
    } else {
      waitingDialog.hide();
    }

    if (isNull(filters)) {
      filters = this.getFilters();
    }
    log("onDatasetValuesChanged: filters: " + JSON.stringify( filters ) );
    for (i in this.plots) { this.plots[i].onDatasetValuesChanged( filters ); };

    setTimeout(this.onPlotReady, 500);
  }

  this.onPlotReady = function () {
    for (i in currentObj.plots) { if (currentObj.plots[i].isVisible && !currentObj.plots[i].isReady) return; };
    if (this.showBlockingLoadDialog){
      waitingDialog.hide();
    }
  }

  this.enableDragDrop = function (enabled) {
    if (isNull(this.dragDropEnabled)) {
      currentObj.$body.sortable({ revert: true });
    }

    this.dragDropEnabled = enabled;
    currentObj.$body.sortable( "option", "disabled", !this.dragDropEnabled );
  }

  this.containsId = function (id) {
    return (this.id == id) || this.getPlotById(id) != null;
  }

  this.getPlotById = function (id) {
    for (i in this.plots) {
      if (this.plots[i].id == id) {
          return this.plots[i];
      }
    }
    return null;
  }

  this.generatePlotId = function (id) {
    return (this.id + "_" + id + "_" + (new Date()).getTime()).replace(/\./g,'').replace(/\//g,'');
  }

  this.broadcastEventToPlots = function (evt_name, evt_data, senderId) {
    for (i in this.plots) {
      this.plots[i].receivePlotEvent(evt_name, evt_data, senderId);
    }
  }

  //RETURN THE PLOTS ARRAY FOR AN EVENTS FITS
  this.getFitsTablePlots = function ( filename, bck_filename, gti_filename, timeUnit, projectConfig ) {

    log("getFitsTablePlots: filename: " + filename );

    var lcPlot = this.getLightCurvePlot ( filename,
                                          bck_filename,
                                          gti_filename,
                                          "EVENTS",
                                          ["TIME (" + timeUnit  + ")", "Count Rate(c/s)"],
                                          "Total Light Curve",
                                          [], "fullWidth", false, true );

    var aLcPlot = this.getLightCurvePlot ( filename,
                                            bck_filename,
                                            gti_filename,
                                            "EVENTS",
                                            ["TIME (" + timeUnit + ")", "A Count Rate(c/s)"],
                                            "Light Curve Range=A",
                                            [ { source: "ColorSelector", table:"EVENTS", column:"Color_A", replaceColumnInPlot: true } ],
                                            "", false, true );

    var bLcPlot = this.getLightCurvePlot ( filename,
                                            bck_filename,
                                            gti_filename,
                                            "EVENTS",
                                            ["TIME (" + timeUnit + ")", "B Count Rate(c/s)"],
                                            "Light Curve Range=B",
                                            [ { source: "ColorSelector", table:"EVENTS", column:"Color_B", replaceColumnInPlot: true } ],
                                            "", false, true );

    var cLcPlot = this.getLightCurvePlot ( filename,
                                            bck_filename,
                                            gti_filename,
                                            "EVENTS",
                                            ["TIME (" + timeUnit + ")", "C Count Rate(c/s)"],
                                            "Light Curve Range=C",
                                            [ { source: "ColorSelector", table:"EVENTS", column:"Color_C", replaceColumnInPlot: true } ],
                                            "", false, true );

    var dLcPlot = this.getLightCurvePlot ( filename,
                                            bck_filename,
                                            gti_filename,
                                            "EVENTS",
                                            ["TIME (" + timeUnit + ")", "D Count Rate(c/s)"],
                                            "Light Curve Range=D",
                                            [ { source: "ColorSelector", table:"EVENTS", column:"Color_D", replaceColumnInPlot: true } ],
                                            "", false, true );

    var baLcPlot = this.getLightCurvePlot ( filename,
                                            bck_filename,
                                            gti_filename,
                                            "EVENTS",
                                            ["TIME (" + timeUnit  + ")", "B/A Color Ratio"],
                                            "Softness Light Curve (B/A)",
                                            [], "fullWidth", false, false );
    baLcPlot.getDataFromServerFn = null; //Disable calls to server

    var dcLcPlot = this.getLightCurvePlot ( filename,
                                            bck_filename,
                                            gti_filename,
                                            "EVENTS",
                                            ["TIME (" + timeUnit  + ")", "D/C Color Ratio"],
                                            "Hardness Light Curve (D/C)",
                                            [], "fullWidth", false, false );
    dcLcPlot.getDataFromServerFn = null; //Disable calls to server

    return [
              lcPlot,

              aLcPlot,

              bLcPlot,

              cLcPlot,

              dLcPlot,

              baLcPlot,

              dcLcPlot,

              this.getJoinedLightCurvesFromColorsPlot ( filename,
                                                        bck_filename,
                                                        gti_filename,
                                                        "EVENTS",
                                                        ["D/C Color Ratio(c/s)", "B/A Color Ratio(c/s)"], "Color-Color Diagram (CCD)",
                                                        [ { source: "ColorSelector", table:"EVENTS", column:"Color_B" },
                                                          { source: "ColorSelector", table:"EVENTS", column:"Color_A" },
                                                          { source: "ColorSelector", table:"EVENTS", column:"Color_D" },
                                                          { source: "ColorSelector", table:"EVENTS", column:"Color_C" } ],
                                                        "fullWidth", true ),

              this.getJoinedLightCurvesFromColorsPlot ( filename,
                                                        bck_filename,
                                                        gti_filename,
                                                        "EVENTS",
                                                        ["Total Count Rate (c/s)", "B/A Color Ratio(c/s)"], "Softness Intensity Diagram (SID)",
                                                        [ { source: "ColorSelector", table:"EVENTS", column:"Color_B" },
                                                          { source: "ColorSelector", table:"EVENTS", column:"Color_A" } ],
                                                        "", true, baLcPlot ),

              this.getJoinedLightCurvesFromColorsPlot ( filename,
                                                        bck_filename,
                                                        gti_filename,
                                                        "EVENTS",
                                                        ["Total Count Rate (c/s)", "D/C Color Ratio(c/s)"], "Hardness Intensity Diagram (HID)",
                                                        [ { source: "ColorSelector", table:"EVENTS", column:"Color_D" },
                                                          { source: "ColorSelector", table:"EVENTS", column:"Color_C" } ],
                                                        "", true, dcLcPlot ),

              this.getPDSPlot ( projectConfig,
                                  filename,
                                  bck_filename,
                                  gti_filename,
                                  "EVENTS", "PHA", "fullWidth", "Total Power Density Spectrum (PDS)" ),

              this.getPDSPlot ( projectConfig,
                                  filename,
                                  bck_filename,
                                  gti_filename,
                                  "EVENTS", "PHA", "", "Power Density Spectrum Range=A",
                                  [ { source: "ColorSelector", table:"EVENTS", column:"Color_A", replaceColumnInPlot: true } ]),

              this.getPDSPlot ( projectConfig,
                                  filename,
                                  bck_filename,
                                  gti_filename,
                                  "EVENTS", "PHA", "", "Power Density Spectrum Range=B",
                                  [ { source: "ColorSelector", table:"EVENTS", column:"Color_B", replaceColumnInPlot: true } ]),

              this.getPDSPlot ( projectConfig,
                                  filename,
                                  bck_filename,
                                  gti_filename,
                                  "EVENTS", "PHA", "", "Power Density Spectrum Range=C",
                                  [ { source: "ColorSelector", table:"EVENTS", column:"Color_C", replaceColumnInPlot: true } ]),

              this.getPDSPlot ( projectConfig,
                                  filename,
                                  bck_filename,
                                  gti_filename,
                                  "EVENTS", "PHA", "", "Power Density Spectrum Range=D",
                                  [ { source: "ColorSelector", table:"EVENTS", column:"Color_D", replaceColumnInPlot: true } ]),

              this.getDynamicalSpectrumPlot ( projectConfig,
                                              filename,
                                              bck_filename,
                                              gti_filename,
                                              "EVENTS", "PHA", "fullScreen", "Total Dynamical Power Spectrum" )
          ];
  }

  this.getPlot = function (id, filename, bck_filename, gti_filename, styles, axis, fn, cssClass) {
    return new Plot(
              id,
              {
                filename: filename,
                bck_filename: bck_filename,
                gti_filename: gti_filename,
                styles: styles,
                axis: axis
              },
              (isNull(fn)) ? this.service.request_plot_data : fn,
              this.onFiltersChangedFromPlot,
              this.onPlotReady,
              this.$toolBar,
              (isNull(cssClass)) ? "fullWidth" : cssClass,
              false
            );
  }

  this.getLightCurvePlot = function ( filename, bck_filename, gti_filename, tableName, labels, title, mandatoryFilters, cssClass, switchable, selectable ) {

    log("getLightCurvePlot: filename: " + filename );
    return new LcPlot(
                      this.generatePlotId("ligthcurve_" + filename),
                      {
                        filename: filename,
                        bck_filename: bck_filename,
                        gti_filename: gti_filename,
                        styles: { type: "ligthcurve",
                                  labels: labels,
                                  title: title,
                                  selectable: selectable
                                },
                        axis: [ { table: tableName, column:"TIME" },
                                { table: tableName, column:"PHA" } ],
                        mandatoryFilters: mandatoryFilters,
                      },
                      this.service.request_lightcurve,
                      this.onFiltersChangedFromPlot,
                      this.onPlotReady,
                      getTabForSelector(this.id).$html.find(".LcPlot").find(".sectionContainer"),
                      "LcPlot " + cssClass,
                      switchable
                    );
  }

  this.getJoinedLightCurvesPlot = function ( lc0_filename, lc1_filename, labels, title, cssClass, switchable ) {

    log("getJoinedLightCurvesPlot: lc0_filename: " + lc0_filename + ", lc0_filename: " + lc1_filename);
    return new Plot(
                      this.generatePlotId("ligthcurve_" + lc0_filename + "_" + lc1_filename),
                      {
                        lc0_filename: lc0_filename,
                        lc1_filename: lc1_filename,
                        styles: { type: "scatter", labels: labels, title: title },
                        axis: [ { table: "RATE", column:"TIME" },
                                { table: "RATE", column:"PHA" } ]
                      },
                      this.service.request_joined_lightcurves,
                      this.onFiltersChangedFromPlot,
                      this.onPlotReady,
                      getTabForSelector(this.id).$html.find(".LcPlot").find(".sectionContainer"),
                      "LcPlot " + cssClass,
                      switchable
                    );
  }

  this.getJoinedLightCurvesFromColorsPlot = function ( filename, bck_filename, gti_filename, tableName, labels, title, mandatoryFilters, cssClass, switchable, linkedPlot ) {

    log("getJoinedLightCurvesFromColorsPlot: filename: " + filename );
    var id = this.generatePlotId("joinedLcByColors_" + filename);
    if (!isNull(linkedPlot)) {
      linkedPlot.parentPlotId = id;
    }
    return new Plot(
                      id,
                      {
                        id: id,
                        filename: filename,
                        bck_filename: bck_filename,
                        gti_filename: gti_filename,
                        styles: { type: "scatter", labels: labels, title: title },
                        axis: [ { table: tableName, column:"TIME" },
                                { table: tableName, column:"PHA" } ],
                        mandatoryFilters: mandatoryFilters,
                        linkedPlotId: (isNull(linkedPlot)) ? null : linkedPlot.id
                      },
                      (isNull(linkedPlot)) ? this.service.request_divided_lightcurves_from_colors : this.getDividedLightCurvesFromColorsDataFromServer,
                      this.onFiltersChangedFromPlot,
                      this.onPlotReady,
                      getTabForSelector(this.id).$html.find(".LcPlot").find(".sectionContainer"),
                      "LcPlot " + cssClass,
                      switchable
                    );
  }

  this.getPDSPlot = function ( projectConfig, filename, bck_filename, gti_filename, tableName, columnName, cssClass, title, mandatoryFilters ) {

    log("getPDSPlot: filename: " + filename );
    return new PDSPlot(
                      this.generatePlotId("pds_" + filename),
                      {
                        filename: filename,
                        bck_filename: bck_filename,
                        gti_filename: gti_filename,
                        styles: { type: "ligthcurve",
                                  labels: ["Frequency (Hz)", "Power"],
                                  title: title,
                                  showFitBtn: true },
                        axis: [ { table: tableName, column:"TIME" },
                                { table: tableName, column:columnName } ],
                        mandatoryFilters: mandatoryFilters,
                      },
                      this.service.request_power_density_spectrum,
                      this.onFiltersChangedFromPlot,
                      this.onPlotReady,
                      getTabForSelector(this.id).$html.find(".PDSPlot").find(".sectionContainer"),
                      "PDSPlot " + cssClass,
                      false,
                      projectConfig
                    );
  }

  this.getDynamicalSpectrumPlot = function ( projectConfig, filename, bck_filename, gti_filename, tableName, columnName, cssClass, title, mandatoryFilters ) {

    log("getDynamicalSpectrumPlot: filename: " + filename );
    return new DynSpPlot(
                      this.generatePlotId("dynX_" + filename),
                      {
                        filename: filename,
                        bck_filename: bck_filename,
                        gti_filename: gti_filename,
                        styles: { type: "surface",
                                  labels: ["Frequency (Hz)", "Time (s)", "Power"],
                                  title: title,
                                  showPdsType: false
                                },
                        axis: [ { table: tableName, column:"TIME" },
                                { table: tableName, column:columnName } ],
                        mandatoryFilters: mandatoryFilters,
                      },
                      this.service.request_dynamical_spectrum,
                      this.onFiltersChangedFromPlot,
                      this.onPlotReady,
                      getTabForSelector(this.id).$html.find(".PDSPlot").find(".sectionContainer"),
                      "PDSPlot " + cssClass,
                      false,
                      projectConfig
                    );
  }

  this.tryAddDividedLightCurve = function (key0, key1, newKeySufix, projectConfig) {
    var data = {};
    data.lc0_filename = projectConfig.getFile(key0);
    data.lc1_filename = projectConfig.getFile(key1);

    var newKey = "LC_" + newKeySufix;

    if ((data.lc0_filename != "") && (data.lc1_filename != "") && (projectConfig.getFile(newKey) == "")){

      //Prepares newKey from divided lcs dataset and adds the plot to output panel
      currentObj.service.request_divided_lightcurve_ds(data, function (result) {
        var cache_key = JSON.parse(result);
        log("request_divided_lightcurve_ds Result: " + newKey + " --> " + cache_key);
        if (!isNull(cache_key) && cache_key != "") {

          projectConfig.setFile(newKey, cache_key);
          currentObj.addLightcurveAndPdsPlots (newKeySufix, cache_key, "", "", "RATE", "PHA", projectConfig, "", true);

          //After getting A/B or C/D we can calculate the Hardness and Softnes Intensity lcs
          if ((newKeySufix == "B/A") || (newKeySufix == "D/C")) {

            joined_lc_plot = currentObj.getJoinedLightCurvesPlot ( projectConfig.getFile("SRC"),
                                                                      cache_key,
                                                                      ["Total Count Rate (c/s)", newKeySufix + " Color Ratio"],
                                                                      ((newKeySufix == "B/A") ? "Softness Intensity Diagram (SID)" : "Hardness Intensity Diagram (HID)"),
                                                                      "", true);
            projectConfig.plots.push(joined_lc_plot);
            projectConfig.addPlotId(joined_lc_plot.id, ((newKeySufix == "B/A") ? "LCB" : "LCD"));
            projectConfig.addPlotId(joined_lc_plot.id, ((newKeySufix == "B/A") ? "LCA" : "LCC"));
            currentObj.appendPlot(joined_lc_plot);

            //After getting A/B and C/D we can calculate the color to color plot
            if ((projectConfig.getFile("LC_B/A") != "")
                  && (projectConfig.getFile("LC_D/C") != "")){

                var abcd_plot = currentObj.getJoinedLightCurvesPlot ( projectConfig.getFile("LC_B/A"),
                                                                      projectConfig.getFile("LC_D/C"),
                                                                      ["B/A Color Ratio(c/s)", "D/C Color Ratio"],
                                                                      "Color-Color Diagram (CCD)", "", true);
                projectConfig.plots.push(abcd_plot);
                projectConfig.addPlotId(abcd_plot.id, "LCA");
                projectConfig.addPlotId(abcd_plot.id, "LCB");
                projectConfig.addPlotId(abcd_plot.id, "LCC");
                projectConfig.addPlotId(abcd_plot.id, "LCD");
                currentObj.appendPlot(abcd_plot);
            }
          }
        } else {
          showError("Can't get divided lightcurves data");
          log("request_divided_lightcurve_ds WRONG CACHE KEY!!");
        }
      });

      return true;
    }

    return false;
  }

  this.addLightcurveAndPdsPlots = function (titlePrefix, filename, bck_filename, gti_filename, tableName, columnName, projectConfig, cssClass, refreshData){
    var mustRefreshData = isNull(refreshData) || refreshData;

    var isJoinedLc = ((titlePrefix == "B/A") || (titlePrefix == "D/C"));
    var yLabel = isJoinedLc ? "Color Ratio" : "Count Rate(c/s)";

    var title = titlePrefix + " LC";
    if (titlePrefix == "SRC") {
      title = "Total Light Curve";
    } else if (titlePrefix.startsWith("LC")) {
      title = "Light Curve Range=" + titlePrefix.replace("LC", "");
    } else if (titlePrefix == "B/A") {
      title = "Softness Light Curve (B/A)";
    } else if (titlePrefix == "D/C") {
      title = "Hardness Light Curve (D/C)";
    }

    var lc_plot = currentObj.getLightCurvePlot ( filename, bck_filename, gti_filename,
                                                tableName,
                                                ["TIME (" + projectConfig.timeUnit  + ")", yLabel],
                                                title,
                                                [], cssClass, false, !isJoinedLc);
    projectConfig.plots.push(lc_plot);
    if (titlePrefix == "B/A"){
      projectConfig.addPlotId(lc_plot.id, "LCA");
      projectConfig.addPlotId(lc_plot.id, "LCB");
    } else if (titlePrefix == "D/C"){
      projectConfig.addPlotId(lc_plot.id, "LCC");
      projectConfig.addPlotId(lc_plot.id, "LCD");
    } else {
      projectConfig.addPlotId(lc_plot.id, titlePrefix);
    }
    currentObj.appendPlot(lc_plot, mustRefreshData);

    var pds_plot = null;
    if ((titlePrefix != "B/A") && (titlePrefix != "D/C")) {

      var title = titlePrefix + " PDS";
      if (titlePrefix == "SRC") {
        title = "Total Power Density Spectrum (PDS)";
      } else if (titlePrefix.startsWith("LC")) {
        title = "Power Density Spectrum Range=" + titlePrefix.replace("LC", "");
      }

      pds_plot = this.getPDSPlot ( projectConfig, filename, bck_filename, gti_filename,
                                      tableName, columnName, cssClass, title );
      projectConfig.plots.push(pds_plot);
      projectConfig.addPlotId(pds_plot.id, titlePrefix);
      currentObj.appendPlot(pds_plot, mustRefreshData);
    }

    if (titlePrefix == "SRC") {
      var dynamical_plot = this.getDynamicalSpectrumPlot ( projectConfig,
                                                          filename,
                                                          bck_filename,
                                                          gti_filename,
                                                          tableName, columnName, "fullScreen", "Total Dynamical Power Spectrum" );
      projectConfig.plots.push(dynamical_plot);
      projectConfig.addPlotId(dynamical_plot.id, "SRC");
      currentObj.appendPlot(dynamical_plot, mustRefreshData);

      return [lc_plot, pds_plot, dynamical_plot];
    } else {

      return [lc_plot, pds_plot];
    }
  }

  this.addRmfPlots = function (projectConfig){

    var covarianceSpectrumPlot = new CovariancePlot(
                                      this.generatePlotId("covarianceSpectrum_" + projectConfig.filename),
                                      {
                                        filename: projectConfig.filename,
                                        bck_filename: projectConfig.bckFilename,
                                        gti_filename: projectConfig.gtiFilename,
                                        styles:{ type: "2d",
                                                 labels: ["Energy(keV)", "Covariance"],
                                                 title: "Covariance Spectrum" }
                                      },
                                      this.service.request_covariance_spectrum,
                                      this.onFiltersChangedFromPlot,
                                      this.onPlotReady,
                                      getTabForSelector(this.id).$html.find(".TimingPlot").find(".sectionContainer"),
                                      "TimingPlot fullWidth",
                                      false,
                                      projectConfig
                                    );
    this.plots.push(covarianceSpectrumPlot);
    projectConfig.addPlotId(covarianceSpectrumPlot.id, "RMF");
    if (this.waitingPlotType != "covariance") { covarianceSpectrumPlot.hide(); }
    this.appendPlot(covarianceSpectrumPlot, true);

    var rmsPlot = this.getRMSPlot ( projectConfig,
                        projectConfig.filename,
                        projectConfig.bckFilename,
                        projectConfig.gtiFilename,
                        "EVENTS", "PHA", "fullWidth", "RMS vs Energy" )
    this.plots.push(rmsPlot);
    projectConfig.addPlotId(rmsPlot.id, "RMF");
    if (this.waitingPlotType != "rms") { rmsPlot.hide(); }
    this.appendPlot(rmsPlot, true);

    var phaseLagPlot = this.getPhaseLagPlot ( projectConfig,
                        projectConfig.filename,
                        projectConfig.bckFilename,
                        projectConfig.gtiFilename,
                        "EVENTS", "PHA", "fullWidth", "Phase lag vs Energy" )
    this.plots.push(phaseLagPlot);
    projectConfig.addPlotId(phaseLagPlot.id, "RMF");
    if (this.waitingPlotType != "phaseLag") { phaseLagPlot.hide(); }
    this.appendPlot(phaseLagPlot, true);

    this.waitingPlotType = null;
  }

  this.getDividedLightCurvesFromColorsDataFromServer = function (paramsData, fn) {

    log("OutputPanel getDividedLightCurvesFromColorsDataFromServer...");

    currentObj.service.request_divided_lightcurves_from_colors(paramsData, function( jsdata ) {
      data = JSON.parse(jsdata);

      var joinedLcPlot = currentObj.getPlotById(paramsData.id);
      joinedLcPlot.setData((!isNull(data)) ? $.extend(true, [], [ data[0], data[1] ]) : null);

      if (!isNull(paramsData.linkedPlotId)) {
        var joinedLcTimePlot = currentObj.getPlotById(paramsData.linkedPlotId);
        var dataValues = { values: data[1].values };
        var dataErrors = { values: data[1].error_values };
        joinedLcTimePlot.setData((!isNull(data)) ? $.extend(true, [], [ data[2], dataValues, dataErrors, data[3], data[4] ]) : null);
      }
    });

  };

  this.getPhaseLagPlot = function ( projectConfig, filename, bck_filename, gti_filename, tableName, columnName, cssClass, title, mandatoryFilters ) {

    log("getPhaseLagPlot: filename: " + filename );
    return new PhaseLagPlot(
                      this.generatePlotId("phaseLag_" + filename),
                      {
                        filename: filename,
                        bck_filename: bck_filename,
                        gti_filename: gti_filename,
                        styles: { type: "ligthcurve",
                                  labels: ["Energy(keV)", "Phase lag"],
                                  title: title },
                        axis: [ { table: tableName, column:"TIME" },
                                { table: tableName, column:columnName } ],
                        mandatoryFilters: mandatoryFilters,
                      },
                      this.service.request_phase_lag_spectrum,
                      this.onFiltersChangedFromPlot,
                      this.onPlotReady,
                      getTabForSelector(this.id).$html.find(".TimingPlot").find(".sectionContainer"),
                      "TimingPlot " + cssClass,
                      false,
                      projectConfig
                    );
  }

  this.getRMSPlot = function ( projectConfig, filename, bck_filename, gti_filename, tableName, columnName, cssClass, title, mandatoryFilters ) {

    log("getRMSPlot: filename: " + filename );
    return new RmsPlot(
                      this.generatePlotId("rms_" + filename),
                      {
                        filename: filename,
                        bck_filename: bck_filename,
                        gti_filename: gti_filename,
                        styles: { type: "ligthcurve",
                                  labels: ["Energy(keV)", "RMS"],
                                  title: title },
                        axis: [ { table: tableName, column:"TIME" },
                                { table: tableName, column:columnName } ],
                        mandatoryFilters: mandatoryFilters,
                      },
                      this.service.request_rms_spectrum,
                      this.onFiltersChangedFromPlot,
                      this.onPlotReady,
                      getTabForSelector(this.id).$html.find(".TimingPlot").find(".sectionContainer"),
                      "TimingPlot " + cssClass,
                      false,
                      projectConfig
                    );
  }

  this.appendPlot = function (plot, refreshData) {
    if (isNull(this.getPlotById(plot.id))) {
      this.plots.push(plot);
    }

    if (this.$body.find(".infoPanel").length > 0) {
      plot.$html.insertBefore(this.$body.find(".infoPanel"));
    } else {
      this.$body.append(plot.$html);
    }

    if (isNull(refreshData) || refreshData) {
      plot.onDatasetValuesChanged(this.getFilters());
    }
  }

  this.removePlotsById = function (plotIds) {
    var tab = getTabForSelector(this.id);
    for (plotIdx in plotIds){
      var plotId = plotIds[plotIdx];
      var plot = this.getPlotById(plotId);
      if (!isNull(plot)) {
        plot.$html.remove();
        tab.$html.find(".sectionContainer").find("." + plot.id).remove();
        this.plots = this.plots.filter(function(plot) {
                          return plot.id !== plotId;
                      });
      }
    }
  }

  this.getConfig = function () {
    var plotConfigs = [];
    for (i in this.plots) {
       plotConfigs.push(this.plots[i].getConfig());
     };
     return plotConfigs;
  }

  this.setConfig = function (plotConfigs) {
    var tab = getTabForSelector(this.id);

    if (plotConfigs.length == this.plots.length){
        for (i in this.plots) {
          this.plots[i].setConfig(plotConfigs[i], tab);
         };
     } else {
       log ("Output.setConfig ERROR: Number of plots mismatch");
     }
  }

  log ("Output panel ready!!");
 }
