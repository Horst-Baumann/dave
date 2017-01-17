const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

var cp = require('child_process');
var rq = require('request-promise');
var Config = require('config-js');

let mainWindow,
    windowParams = {
        width:1200,
        height: 700
    };
var retryInterval = 0.5 * 1000;
var retries = 0;
var connected = false;
var subpy = null;
var processRunning = true; //If false could cause fail of first connectToServer call

var statusMsg = "";
var logMessage = "";
var logDebugMode = false;

var PYTHON_URL = "";

app.on('ready', function() {
  createWindow();

  var config = loadConfig();
  console.log('config: ' + JSON.stringify(config));

  if (config.error == null) {

    logDebugMode = config.logDebugMode;

    if (!config.pythonEnabled && !config.envEnabled) {
      log('All server modes are disabled on configuration. Connecting anyways...');
    } else if (config.pythonEnabled) {
      launchProcess ("python", config.pythonPath, "Python");
    } else if (config.envEnabled) {
      launchProcess ("/bin/bash", config.envScriptPath, "Env&Python");
    }

    PYTHON_URL = config.pythonUrl;
    console.log('Connecting to server... URL: ' + PYTHON_URL);
    connectToServer ();

  } else {

    log('Error loading DAVE configuration: </br> ERROR: ' + config.error +  '</br> CWD: ' + __dirname);
  }
});

function loadConfig(){
  try {
      var config = new Config(__dirname + '/config.js')
      var configObj = { "error" : null };

      configObj.envEnabled = config.get('environment.enabled') == "true";
      configObj.envScriptPath = __dirname + "/" + config.get('environment.path');

      configObj.pythonEnabled = config.get('python.enabled') == "true";
      configObj.pythonPath = __dirname + "/" + config.get('python.path');
      configObj.pythonUrl = config.get('python.url');

      configObj.logDebugMode = config.get('logDebugMode') == "true";

      return configObj;

    } catch (ex) {
      return { "error" : ex };
    }
}

function launchProcess(process, argument, processName) {
  try {
    if (logDebugMode) {
      log('Launching ' + processName + '... </br> CMD: ' + process + " " + argument + '</br> CWD: ' + __dirname );
    }

    subpy = cp.spawn(process, [argument]);

    subpy.stdout.on('data', (data) => {
      log(processName + ' stdout: ' + data);
    });

    subpy.stderr.on('data', (data) => {
      if (logDebugMode) {
        log(processName + ' Error: ' + data);
      }
    });

    subpy.on('close', (code) => {
      processRunning = false;
      if (code == 0) {
        log(processName + ' server stopped!');
      } else {
        log(processName + ' server stopped with code: ' + code);
      }
    });

  } catch (ex) {

    log('Error on launchProcess </br> ERROR: ' + ex +  '</br> CWD: ' + __dirname);
    return false;
  }
}

function connectToServer (){

  if (!connected && processRunning) {

    if (retries % 10 == 0){
      var seconds = (retries  * (retryInterval/1000));
      log('Connecting to server..... ' + Math.ceil(seconds) + 's');
    }

    rq(PYTHON_URL)
      .then(function(htmlString){

        connected = true;
        console.log('Server started!');
        loadDaveContents(PYTHON_URL);
      })
      .catch(function(err){

        console.log('Connection error: ' + err);
        retries ++;
        setTimeout (function(){ console.log('.....'); connectToServer(); }, retryInterval);
      });
    } else if (processRunning) {

      console.log('Just connected');
    }
}

function createWindow (){
  mainWindow = new BrowserWindow(windowParams);
  mainWindow.on('closed', function() { stop(); });
  //mainWindow.webContents.openDevTools();
}

function loadDaveContents (url){
  mainWindow.loadURL(url);
  mainWindow.webContents.session.clearCache(function(){})
}

function log (msg){
  logMessage = msg + "</br>" + logMessage;
  console.log(msg);
  logToWindow(logMessage);
}

function logToWindow (msg){
  if (mainWindow != null) {
    var style = '<style>.myclass {position: absolute;top: 50%;width:95%;text-align:center}</style>'
    var html = '<div class="myclass">' + statusMsg + msg + '</div>'
    mainWindow.loadURL("data:text/html;charset=utf-8," + encodeURI(style + html));
  }
}

app.on('window-all-closed', function() {
    stop();
});

function stop (){
  if (mainWindow != null){
    mainWindow = null;
    if (subpy != null) {
      console.log('Stopping server!');
      subpy.kill('SIGINT');
      setTimeout (function(){ app.quit(); }, retryInterval);
    }
  }
}
