
ModelParameters = [] //Array with the parameters names of each type of model

//Model Selector: Container with all supported models
function ModelSelector(id, onModelsChangedFn, onFitClickedFn, applyBootstrapFn, applyBayesianParEstFn, filename) {

  var currentObj = this;
  this.id = id.replace(/[^\w]/g,'');
  this.onModelsChangedFn = onModelsChangedFn;
  this.onFitClickedFn = onFitClickedFn;
  this.applyBootstrapFn = applyBootstrapFn;
  this.applyBayesianParEstFn = applyBayesianParEstFn;
  this.filename = filename.replace(/[^\w]/g,'');

  this.models = [];
  this.$html = $('<div class="modelSelector ' + this.id + '">' +
                  '<h3>MODELS:</h3>' +
                  '<div class="floatingContainer">' +
                    '<button class="btn button btnClear" data-toggle="tooltip" title="Clear actions"><i class="fa fa-eraser" aria-hidden="true"></i></button>' +
                    '<button class="btn button btnUndo" data-toggle="tooltip" title="Undo last"><i class="fa fa-history" aria-hidden="true"></i></button>' +
                    '<button class="btn button btnLoad" data-toggle="tooltip" title="Load models"><i class="fa fa-folder-open-o" aria-hidden="true"></i></button>' +
                    '<button class="btn button btnSave" data-toggle="tooltip" title="Save models"><i class="fa fa-floppy-o" aria-hidden="true"></i></button>' +
                    '<button class="btn button btnCopy" data-toggle="tooltip" title="Copy to clipboard"><i class="fa fa-clipboard" aria-hidden="true"></i></button>' +
                  '</div>' +
                  '<div class="buttonsContainer">' +
                    '<button class="btn btn-info btnConst"><i class="fa fa-plus" aria-hidden="true"></i> Const</button>' +
                    '<button class="btn btn-info btnGaussian"><i class="fa fa-plus" aria-hidden="true"></i> Gaussian</button>' +
                    '<button class="btn btn-info btnLorentz"><i class="fa fa-plus" aria-hidden="true"></i> Lorentz</button>' +
                    '<button class="btn btn-info btnPowerLaw"><i class="fa fa-plus" aria-hidden="true"></i> PowerLaw</button>' +
                    '<button class="btn btn-info btnBrokenPowerLaw"><i class="fa fa-plus" aria-hidden="true"></i> BrokenPowerLaw</button>' +
                  '</div>' +
                  '<div class="modelsContainer">' +
                  '</div>' +
                  '<div class="actionsContainer">' +
                    '<button class="btn btn-primary fitBtn"><i class="fa fa-line-chart" aria-hidden="true"></i> FIT</button>' +
                    '<button class="btn btn-success applyBtn"><i class="fa fa-check-circle" aria-hidden="true"></i> APPLY ALL</button>' +
                    '<button class="btn btn-danger parEstBtn bayesianParEstBtn"><i class="fa fa-line-chart" aria-hidden="true"></i> BAYESIAN PAR. EST.</button>' +
                    '<button class="btn btn-danger parEstBtn_HIDDEN bootstrapBtn"><i class="fa fa-line-chart" aria-hidden="true"></i> BOOTSTRAP</button>' +
                  '</div>' +
                '</div>');

  this.$html.find(".btnClear").click(function () {
    currentObj.historyManager.resetHistory();
    gaTracker.sendEvent("Fitting", "resetHistory", currentObj.filename);
  });

  this.$html.find(".btnUndo").click(function () {
    currentObj.historyManager.undoHistory();
    gaTracker.sendEvent("Fitting", "undoHistory", currentObj.filename);
  });

  this.$html.find(".btnLoad").click(function () {
    currentObj.loadModels();
    gaTracker.sendEvent("Fitting", "loadModels", currentObj.filename);
  });

  this.$html.find(".btnSave").click(function () {
    currentObj.saveModels();
    gaTracker.sendEvent("Fitting", "saveModels", currentObj.filename);
  });

  this.$html.find(".btnCopy").click(function () {
    copyToClipboard(currentObj.modelsToLaTeX());
    gaTracker.sendEvent("Fitting", "copyToClipboard", currentObj.filename);
  });

  this.$html.find(".btnConst").click(function () {
    currentObj.addModel(currentObj.getModelFromDaveModel({ type:"Const", color:getRandomColor() }));
    gaTracker.sendEvent("Fitting", "addConst", currentObj.filename);
  });

  this.$html.find(".btnGaussian").click(function () {
    currentObj.addModel(currentObj.getModelFromDaveModel({ type:"Gaussian", color:getRandomColor() }));
    gaTracker.sendEvent("Fitting", "addGaussian", currentObj.filename);
  });

  this.$html.find(".btnLorentz").click(function () {
    currentObj.addModel(currentObj.getModelFromDaveModel({ type:"Lorentz", color:getRandomColor() }));
    gaTracker.sendEvent("Fitting", "addLorentz", currentObj.filename);
  });

  this.$html.find(".btnPowerLaw").click(function () {
    currentObj.addModel(currentObj.getModelFromDaveModel({ type:"PowerLaw", color:getRandomColor() }));
    gaTracker.sendEvent("Fitting", "addPowerLaw", currentObj.filename);
  });

  this.$html.find(".btnBrokenPowerLaw").click(function () {
    currentObj.addModel(currentObj.getModelFromDaveModel({ type:"BrokenPowerLaw", color:getRandomColor() }));
    gaTracker.sendEvent("Fitting", "addBrokenPowerLaw", currentObj.filename);
  });

  this.$html.find(".fitBtn").click(function () {
    currentObj.onFitClickedFn();
    gaTracker.sendEvent("Fitting", "FitModel", currentObj.filename);
  }).hide();

  this.$html.find(".applyBtn").click(function () {
    currentObj.applyAllEstimations();
    gaTracker.sendEvent("Fitting", "applyAll", currentObj.filename);
    $(this).hide();
  }).hide();

  this.$html.find(".bayesianParEstBtn").click(function () {
    currentObj.applyBayesianParEstFn();
    gaTracker.sendEvent("Fitting", "BayesianParEst", currentObj.filename);
  }).hide();

  this.$html.find(".bootstrapBtn").click(function () {
    currentObj.applyBootstrapFn();
    gaTracker.sendEvent("Fitting", "Bootstrap", currentObj.filename);
  }).hide();

  this.getModelFromDaveModel = function (daveModel) {
    var model = null;
    if (daveModel.type == "Const") {
      model = new ConstModel(currentObj.models.length, daveModel.color, currentObj.onModelsChanged)
    } else if (daveModel.type == "Gaussian") {
      model = new GaussianModel(currentObj.models.length, daveModel.color, currentObj.onModelsChanged)
    } else if (daveModel.type == "Lorentz") {
      model = new LorentzModel(currentObj.models.length, daveModel.color, currentObj.onModelsChanged)
    } else if (daveModel.type == "PowerLaw") {
      model = new PowerLawModel(currentObj.models.length, daveModel.color, currentObj.onModelsChanged)
    } else if (daveModel.type == "BrokenPowerLaw") {
      model = new BrokenPowerLawModel(currentObj.models.length, daveModel.color, currentObj.onModelsChanged)
    }

    if (!isNull(model) && Object.keys(daveModel).length > 2) {
        //If is loaded model, not only default params model
        model = $.extend(true, model, daveModel);
        if (!isNull(daveModel.fixed)){
          for (i in daveModel.fixed){
            model.switchFixedParam(daveModel.fixed[i]);
          }
        }
        model.setInputs();
    }

    return model;
  }

  this.addModel = function (model, refresh){
    if (this.$html.find(".modelsContainer").find(".combinedLbl").length == 0) {
      var combinedModelColor = getTabForSelector(this.id).getDefaultPlotlyConfig().COMBINED_MDL_COLOR;
      this.$html.find(".modelsContainer").append('<h3 class="combinedLbl" style="color: ' + combinedModelColor + '"><div class="color-wrapper"></div>Combined Model</h3>');
      this.$html.find(".color-wrapper").append(getColorPicker("colorPickerMdl_" + this.id, combinedModelColor, function (color, id) {
        getTabForSelector(currentObj.id).getDefaultPlotlyConfig().COMBINED_MDL_COLOR = color;
        currentObj.$html.find(".combinedLbl").attr("style", "color:" + color);
        currentObj.onModelsChanged(false);
      }));
    }
    this.models.push(model);
    this.$html.find(".modelsContainer").append(model.$html);
    this.$html.find(".fitBtn").show();
    if (isNull(refresh) || refresh) {
      this.onModelsChanged();
    }
  }

  this.getModels = function (estimated){
    var models = [];
    for (i in currentObj.models){
      var model = currentObj.models[i].getModel(!isNull(estimated) && estimated);
      if (!isNull(model)){
        models.push(model);
      }
    }

    if (!estimated) {
      setVisibility(currentObj.$html.find(".actionsContainer"), models.length > 0);
      currentObj.$html.find(".btnSave").prop('disabled', models.length == 0);
    }

    return models;
  };

  this.setModels = function (models, updateHistory) {
    this.clearModels(updateHistory);
    for (i in models){
      var model = null;
      if (!isNull(models[i].type) && !isNull(models[i].color)){
        model = this.getModelFromDaveModel(models[i]);
      }
      if (!isNull(model)){
        this.addModel(model, false);
      } else {
       showError("Can't import models");
       return;
      }
    }
    this.onModelsChanged(updateHistory);
  }

  this.onModelsChanged = function (saveHistory) {
    if (isNull(saveHistory) || saveHistory){
      currentObj.saveHistory();
    }
    currentObj.onModelsChangedFn();
  }

  this.setEstimation = function (params, showApplyBtn) {
    var idx = 0;
    var visibleModelsCount = this.getModels().length;
    for (i in this.models){
      if (this.models[i].visible) {
        this.models[i].setEstimation(params, (visibleModelsCount > 1) ? idx : -1);
        idx ++;
      }
    }

    var applyBtnVisible = idx > 0 && showApplyBtn;
    setVisibility(this.$html.find(".applyBtn"), applyBtnVisible);
    if (applyBtnVisible) {
      this.onModelsChanged();
    }
  }

  this.applyAllEstimations = function (){
    for (i in this.models){
      this.models[i].applyEstimations();
    }
    this.$html.find(".parEstBtn").show();
    this.onModelsChanged();
  };

  this.clearAllEstimationsAndErrors = function (){
    for (i in this.models){
      this.models[i].clearEstimationsAndErrors();
    }
    this.$html.find(".applyBtn").hide();
    this.$html.find(".parEstBtn").hide();
  };

  this.saveModels = function () {
    saveToFile (currentObj.filename + "_models.mdl", JSON.stringify(currentObj.getModels()));
  }

  this.loadModels = function () {
    showLoadFile (function(e, file) {
      try {
        if (!isNull(e)) {
          currentObj.setModels(JSON.parse(e.target.result));
        } else {
          showError("File: " + file.name + " is not supported as models");
        }
     } catch (e) {
       showError("File: " + file.name + " is not supported as models", e);
     }
    }, ".mdl");
  }

  this.containsId = function (id) {
    if (this.id != id) {
      for (i in this.models){
        if (this.models[i].id == id) {
          return true;
        }
      }
    } else {
      return true;
    }
    return false;
  }

  this.modelsToLaTeX = function() {
    var laTeX = "\\begin{tabular}{ l | c | c } \n \\hline \n";
    for (i in this.models){
      if (this.models[i].visible) {
        laTeX += this.models[i].toLaTeXRows();
      }
    }
    laTeX += "\\hline \n \\end{tabular}";
    return laTeX;
  }

  this.clearModels = function(resetHistory) {
    this.models = [];
    this.$html.find(".modelsContainer").html("");
    this.$html.find(".actionsContainer").hide();

    //Reset History and add default models
    if (isNull(resetHistory) || resetHistory){
      currentObj.historyManager.actionsHistory = [];
      currentObj.saveHistory();
    }
  }

  this.getConfig = function () {
    return { models: this.getModels(),
             applyBtnVisible: this.$html.find(".applyBtn").is(":visible"),
             parEstBtnVisible: this.$html.find(".parEstBtn").is(":visible") };
  }

  this.setConfig = function (config, updateHistory) {
    this.setModels(config.models, updateHistory);
    setVisibility(this.$html.find(".applyBtn"), config.applyBtnVisible);
    setVisibility(this.$html.find(".parEstBtn"), config.parEstBtnVisible);
  }

  this.saveHistory = function (){
      //Prepares undo button
      currentObj.$html.find(".btnUndo").prop('disabled', (currentObj.historyManager.prevAction == null));

      //Adds config as action to historyManager
      currentObj.historyManager.addToHistory($.extend(true, [], currentObj.getConfig()));
  }

  this.applyAction = function (action){
    if (action != null){
      //Sets stored config saved as action on historyManager, updates models without modifiying history
      currentObj.setConfig(action, false);
      currentObj.$html.find(".btnUndo").prop('disabled', currentObj.historyManager.actionsHistory.length == 0);
    }
  }

  this.historyManager = new HistoryManager(this.applyAction);
  this.saveHistory();

  log ("new ModelSelector id: " + this.id);

  return this;
}


//Model: Base model class
function Model(idx, title, type, color, onModelsChangedFn) {

  var currentObj = this;
  if (isNull(this.id)) {
    this.id = "model_" + idx;
  }
  this.type = type;
  this.idx = idx;
  this.title = title;
  this.color = color;
  this.onModelsChangedFn = onModelsChangedFn;
  this.visible = true;

  this.$html = $('<div class="model ' + this.type + ' ' + this.id + '">' +
                  '<h3 style="color: ' + this.color + '">' +
                    '<div class="color-wrapper"></div>' +
                    this.title +
                    '<div class="switch-wrapper">' +
                      '<div id="switch_' + this.id + '" class="switch-btn fa fa-minus-square" aria-hidden="true"></div>' +
                    '</div>' +
                  '</h3>' +
                  '<div class="container paramContainer">' +
                  '</div>' +
                '</div>');

  //Prepares switchBox
  this.$html.find("#switch_" + this.id).click( function ( event ) {
    currentObj.visible = !currentObj.visible;
    if (!currentObj.onValuesChanged()) { currentObj.onModelsChangedFn(); }
    if (currentObj.visible) {
      $(this).switchClass("fa-plus-square", "fa-minus-square");
      currentObj.$html.find(".paramContainer").fadeIn();
    } else {
      $(this).switchClass("fa-minus-square", "fa-plus-square");
      currentObj.$html.find(".paramContainer").fadeOut();
    }
  });

  this.$html.find(".color-wrapper").append(getColorPicker("colorPickerMdl_" + this.id, this.color, function (color, id) {
    currentObj.color = color;
    currentObj.$html.find("h3").attr("style", "color:" + color);
    currentObj.onModelsChangedFn(false);
  }));

  this.setInputs = function () {
    var modelParams = this.getParameters();
    var $paramContainer = this.$html.find(".paramContainer");
    $paramContainer.html("");

    for (p in modelParams){
      var paramName = modelParams[p];

      var $paramHtml = $('<div class="row ' + paramName + '">' +
                            paramName + ':' +
                            '<input id="' + paramName + '_' + this.id + '" class="input_' + paramName + '" type="text" name="' + paramName + '_' + this.id + '" placeholder="' + this[paramName].toFixed(3) + '" value="' + this[paramName].toFixed(3) + '" />' +
                            '<div class="switch-wrapper">' +
                            '  <div id="switch_' + paramName + '_' + this.id + '" param="' + paramName + '" class="switch-btn fa fa-square-o" aria-hidden="true"></div>' +
                            '</div>' +
                          '</div>');

      if (this.isFixedParam(paramName)){
        //If param is fixed, just set it as fixed
        $paramHtml.find(".switch-btn").switchClass("fa-square-o", "fa-check-square-o");
        $paramHtml.find("input").addClass("fixed");
        $paramHtml.find("input").attr("disabled", true);
      } else if (!isNull(this[paramName + "Err"])){
        //If we have errors calculated for this param show it
        var error = this[paramName + "Err"];
        var $errorHtml = $('<div class="error">' +
                              '<div class="err">+/-' + Math.abs(error).toFixed(3) + '</div>' +
                            '</div>');
        $paramHtml.append($errorHtml);

      } else if (!isNull(this[paramName + "Est"])){
        if (this[paramName + "Est"].value != this[paramName]){
          //If the estimation is not applied, shows the estimation near the input
          var estimation = this[paramName + "Est"];
          var $estimationHtml = $('<div class="estimation">' +
                                    '<a href="#" class="applySngBtn" param="' + paramName + '"><i class="fa fa-check-circle" aria-hidden="true"></i></a>' +
                                    '<div class="value">' + estimation.value.toFixed(3) + '</div>' +
                                    '<div class="err">+/-' + estimation.err.toFixed(3) + '</div>' +
                                  '</div>');
          $estimationHtml.find(".applySngBtn").click(function () {
            currentObj.applyEstimation($(this).attr("param"));
            currentObj.setInputs();
            currentObj.onModelsChangedFn();
            gaTracker.sendEvent("Fitting", "applySng", currentObj.filename);
          });
          $paramHtml.append($estimationHtml);
        }
      }

      //Sets the text as green if has same value that the estimation (applied)
      if (!isNull(this[paramName + "Est"]) && this[paramName + "Est"].value == this[paramName]) {
        $paramHtml.find("input").addClass("applied");
      }

      $paramContainer.append($paramHtml);
    }

    $paramContainer.find("input").on('change', this.onValuesChanged);
    $paramContainer.find(".switch-btn").click( function ( event ) {
      currentObj.switchFixedParam($(this).attr("param"));
      currentObj.onValuesChanged();
      currentObj.setInputs();
    });
  }

  this.onValuesChanged = function(){
    var modelChanged = false;

    try {
      var modelParams = currentObj.getParameters();
      var paramContainer = currentObj.$html.find(".paramContainer");

      for (p in modelParams){
        var paramName = modelParams[p];
        var value = getInputFloatValue(paramContainer.find(".input_" + paramName), currentObj[paramName]);
        if (currentObj[paramName] != value){
          currentObj[paramName] = value;
          modelChanged = true;
        }
      }

      if (modelChanged) {
        currentObj.onModelsChangedFn();
      }

    } catch (e) {
      log("onValuesChanged error, model" + currentObj.id + ", error: " + e);
    }

    return modelChanged;
  }

  this.getModel = function (estimated) {
    if (this.visible) {
      var daveModel = { type: this.type, color: this.color };
      var modelParams = this.getParameters();

      for (p in modelParams){
        var paramName = modelParams[p];
        if (!estimated) {
          daveModel[paramName] = this[paramName];
        } else if (!isNull(this[paramName + "Est"])){
          daveModel[paramName] = this[paramName + "Est"].value;
          daveModel[paramName + "Err"] = this[paramName + "Est"].err;
        } else {
          return null;
        }

        if (this.isFixedParam(paramName)){
          //Adds fixed param to model
          if (isNull(daveModel["fixed"])){
            daveModel["fixed"] = [];
          }
          daveModel["fixed"].push(paramName);
        }
      }

      return daveModel;
    }

    return null;
  }

  this.setEstimation = function (params, modelIdx) {
    var modelParams = this.getParameters();

    for (p in modelParams){
      var paramName = modelParams[p] + ((modelIdx != -1) ? "_" + modelIdx : "");

      for (i in params){
        var param = params[i];

        if (param.name == paramName) {
            if (!isNull(param.opt)) {
              //The estimation is an Stingray parameters optimization
              this[modelParams[p] + "Est"] = { value: param.opt, err: param.err };
            } else {
              //The estimation is from Bootstrap method
              this[modelParams[p] + "Err"] = param.err;
            }
            break;
        }
      }
    }
    this.setInputs();
  }

  this.applyEstimations = function (paramName) {
    if (this.visible) {
      var daveModel = { type: this.type, color: this.color };
      var modelParams = this.getParameters();
      for (p in modelParams){
        this.applyEstimation(modelParams[p]);
      }
      this.setInputs();
    }
  }

  this.applyEstimation = function (paramName) {
    if (!isNull(this[paramName + "Est"])){
      this[paramName] = this[paramName + "Est"].value;
      //this[paramName + "Est"] = null;
    }
  }

  this.clearEstimationsAndErrors = function () {
    var modelParams = this.getParameters();
    for (p in modelParams){
      this[modelParams[p] + "Est"] = null;
      this[modelParams[p] + "Err"] = null;
    }
    this.setInputs();
  }

  this.isFixedParam = function (paramName) {
    return !isNull(this[paramName + "Fixed"]) && this[paramName + "Fixed"];
  }

  this.switchFixedParam = function (paramName) {
    if (this.isFixedParam(paramName)){
      this[paramName + "Fixed"] = false;
    } else {
      this[paramName + "Fixed"] = true;
    }
  }

  this.toLaTeXRows = function() {
    var laTexRows = "";
    var modelParams = this.getParameters();

    for (p in modelParams){
      var paramName = modelParams[p];
      var paramValue = "---";
      var paramErr = "---";
      if (!isNull(this[paramName + "Est"])){
        paramValue = this[paramName + "Est"].value.toFixed(3);
        paramErr = this[paramName + "Est"].err.toFixed(3);
      } else {
        paramValue = this[paramName].toFixed(3);
      }

      if (this.isFixedParam(paramName)){
        paramErr = "fixed";
      }

      laTexRows += this.type + " " + this.idx + " " + paramName + " & " + paramValue + " & " + paramErr + " \\\\ \n";
    }

    return laTexRows;
  }

  log ("new Model id: " + this.id);

  return this;
}

//Model: Const specific model inherited from Model class
function ConstModel(idx, color, onModelsChangedFn) {

  var currentObj = this;
  this.id = "const_" + idx;

  this.amplitude = 5.0;

  this.getParameters = function () {
    return ModelParameters["Const"];
  }

  Model.call(this,
            idx,
            'Const ' + idx + ':',
            'Const',
            color, onModelsChangedFn);

  //Prepares inputs
  this.setInputs();

  log ("new ConstModel id: " + this.id);

  return this;
};
ModelParameters["Const"] = ["amplitude"];


//Model: Gaussian specific model inherited from Model class
function GaussianModel(idx, color, onModelsChangedFn) {

  var currentObj = this;
  this.id = "gaussian_" + idx;

  this.amplitude = 5.0;
  this.mean = 1.0;
  this.stddev = 0.5;

  this.getParameters = function () {
    return ModelParameters["Gaussian"];
  }

  Model.call(this,
            idx,
            'Gaussian ' + idx + ':',
            'Gaussian',
            color, onModelsChangedFn);

  //Prepares inputs
  this.setInputs();

  log ("new GaussianModel id: " + this.id);

  return this;
};
ModelParameters["Gaussian"] = ["amplitude", "mean", "stddev"];


//Model: Lorentz specific model inherited from Model class
function LorentzModel(idx, color, onModelsChangedFn) {

  var currentObj = this;
  this.id = "lorentz_" + idx;

  this.amplitude = 5.0;
  this.x_0 = 1.0;
  this.fwhm = 0.5;

  this.getParameters = function () {
    return ModelParameters["Lorentz"];
  }

  Model.call(this,
            idx,
            'Lorentz ' + idx + ':',
            'Lorentz',
            color, onModelsChangedFn);

  //Prepares inputs
  this.setInputs();

  log ("new LorentzModel id: " + this.id);

  return this;
}
ModelParameters["Lorentz"] = ["amplitude", "x_0", "fwhm"];

//Model: PowerLaw specific model inherited from Model class
function PowerLawModel(idx, color, onModelsChangedFn) {

  var currentObj = this;
  this.id = "powerLaw_" + idx;

  this.amplitude = 5.0;
  this.x_0 = 1.0;
  this.alpha = 0.5;

  this.getParameters = function () {
    return ModelParameters["PowerLaw"];
  }

  Model.call(this,
            idx,
            'PowerLaw ' + idx + ':',
            'PowerLaw',
            color, onModelsChangedFn);

  //Prepares inputs
  this.setInputs();

  log ("new PowerLawModel id: " + this.id);

  return this;
}
ModelParameters["PowerLaw"] = ["amplitude", "x_0", "alpha"];


//Model: BrokenPowerLaw specific model inherited from Model class
function BrokenPowerLawModel(idx, color, onModelsChangedFn) {

  var currentObj = this;
  this.id = "brokenPowerLaw_" + idx;

  this.amplitude = 5.0;
  this.x_break = 1.0;
  this.alpha_1 = 0.5;
  this.alpha_2 = 0.5;

  this.getParameters = function () {
    return ModelParameters["BrokenPowerLaw"];
  }

  Model.call(this,
            idx,
            'BrokenPowerLaw ' + idx + ':',
            'BrokenPowerLaw',
            color, onModelsChangedFn);

  //Prepares inputs
  this.setInputs();

  log ("new BrokenPowerLawModel id: " + this.id);

  return this;
}
ModelParameters["BrokenPowerLaw"] = ["amplitude", "x_break", "alpha_1", "alpha_2"];
