
function Service (base_url) {

  var thisService = this;

  this.base_url = base_url;

  this.upload_form_data = function (successFn, progressFn, errorFn, formData) {
    $.ajax({
       url: thisService.base_url + "/upload",
       type: 'POST',
       //Ajax events
       success: successFn,
       error: errorFn,
       // Form data
       data: formData,
       //Options to tell jQuery not to process data or worry about content-type.
       cache: false,
       contentType: false,
       processData: false,

       // Custom XMLHttpRequest
        xhr: function() {
            var myXhr = $.ajaxSettings.xhr();
            if (myXhr.upload) {
                // For handling the progress of the upload
                myXhr.upload.addEventListener('progress', progressFn, false);
            }
            return myXhr;
        }
     });
   };

  this.get_dataset_schema  = function ( filename, fn, errorFn, params ) {
    $.get( thisService.base_url + "/get_dataset_schema", { filename: filename } )
      .done(function(res){fn(res, params);})
      .fail(errorFn);
  };

  this.get_dataset_header  = function ( filename, fn ) {
    $.get( thisService.base_url + "/get_dataset_header", { filename: filename } )
      .done(fn)
      .fail(fn);
  };

  this.append_file_to_dataset  = function ( filename, nextfile, fn, errorFn, params ) {
    return thisService.make_ajax_call("append_file_to_dataset",
                                      { filename: filename, nextfile: nextfile },
                                        function(res){fn(res, params);},
                                        errorFn);
  };

  this.apply_rmf_file_to_dataset  = function ( filename, rmf_filename, fn ) {
    $.get( thisService.base_url + "/apply_rmf_file_to_dataset", { filename: filename, rmf_filename: rmf_filename } )
      .done(fn)
      .fail(fn);
  };

  this.make_ajax_call = function (callName, data, fn, errorFn) {
    if (!isNull(data)){
      if (isNull(data.x_values)){
        log(callName + " ,data: " + JSON.stringify(data));
      } else {
        log(callName + " ,data: " + JSON.stringify({ x_values: data.x_values.length, models: data.models, estimated: data.estimated }));
      }
    }
    try {
      return $.ajax({
         type : "POST",
         url : thisService.base_url + "/" + callName,
         data: JSON.stringify(data, null, '\t'),
         contentType: 'application/json;charset=UTF-8',
         success: fn,
         error: isNull(errorFn) ? fn : errorFn
      });
    } catch (e) {
      if (isNull(errorFn)) {
        fn({ "error" : e });
      } else {
        errorFn({ "error" : e });
      }
      return null;
    }
  };

  this.request_plot_data = function (data, fn) {
    return thisService.make_ajax_call("get_plot_data", data, fn);
  };

  this.request_lightcurve = function (data, fn) {
    return thisService.make_ajax_call("get_lightcurve", data, fn);
  };

  this.request_divided_lightcurves_from_colors = function (data, fn) {
    return thisService.make_ajax_call("get_divided_lightcurves_from_colors", data, fn);
  };

  this.request_joined_lightcurves = function (data, fn) {
    return thisService.make_ajax_call("get_joined_lightcurves", data, fn);
  };

  this.request_divided_lightcurve_ds = function (data, fn) {
    return thisService.make_ajax_call("get_divided_lightcurve_ds", data, fn);
  };

  this.request_power_density_spectrum = function (data, fn) {
    return thisService.make_ajax_call("get_power_density_spectrum", data, fn);
  };

  this.request_dynamical_spectrum = function (data, fn) {
    return thisService.make_ajax_call("get_dynamical_spectrum", data, fn);
  };

  this.request_cross_spectrum = function (data, fn) {
    return thisService.make_ajax_call("get_cross_spectrum", data, fn);
  };

  this.request_covariance_spectrum  = function ( data, fn ) {
    return thisService.make_ajax_call("get_covariance_spectrum", data, fn);
  };

  this.request_phase_lag_spectrum  = function ( data, fn ) {
    return thisService.make_ajax_call("get_phase_lag_spectrum", data, fn);
  };

  this.request_rms_spectrum  = function ( data, fn ) {
    return thisService.make_ajax_call("get_rms_spectrum", data, fn);
  };

  this.request_plot_data_from_models  = function ( data, fn ) {
    return thisService.make_ajax_call("get_plot_data_from_models", data, fn);
  };

  this.request_fit_powerspectrum_result = function (data, fn) {
    return thisService.make_ajax_call("get_fit_powerspectrum_result", data, fn);
  };

  this.request_bootstrap_results  = function ( data, fn ) {
    return thisService.make_ajax_call("get_bootstrap_results", data, fn);
  };

  this.request_intermediate_files = function (filepaths, fn) {
     return thisService.make_ajax_call("get_intermediate_files", { filepaths: filepaths }, fn);
  };

  this.request_bulk_analisys  = function ( data, fn ) {
    return thisService.make_ajax_call("bulk_analisys", data, fn);
  };

  this.set_config = function (config, fn) {
     return thisService.make_ajax_call("set_config", config, fn);
  };

  this.clear_cache = function (fn) {
     return thisService.make_ajax_call("clear_cache", null, fn);
  };

  this.request_lomb_scargle_results  = function ( data, fn ) {
    return thisService.make_ajax_call("get_lomb_scargle_results", data, fn);
  };

  this.request_fit_lomb_scargle_result  = function ( data, fn ) {
    return thisService.make_ajax_call("get_fit_lomb_scargle_result", data, fn);
  };

  this.request_fit_powerspectrum_result = function (data, fn) {
    return thisService.make_ajax_call("get_fit_powerspectrum_result", data, fn);
  };

  this.request_pulse_search  = function ( data, fn ) {
    return thisService.make_ajax_call("get_pulse_search", data, fn);
  };

  this.request_phaseogram  = function ( data, fn ) {
    return thisService.make_ajax_call("get_phaseogram", data, fn);
  };

  this.subscribe_to_server_messages = function (fn) {
    var evtSrc = new EventSource("/subscribe");
    evtSrc.onmessage = function(e) {
        try {
          fn(e.data);
        } catch (ex){
          log("SERVER MSG ERROR: " + e + ", error: " + ex);
        }
    };
  };

  log("Service ready!");
}
