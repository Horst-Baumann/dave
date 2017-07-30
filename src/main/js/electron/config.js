module.exports = {
  environment : {
    enabled : 'true',
    path : '../../resources/bash/activate_and_launch_dev.bash'
  },
  python : {
    enabled : 'true',
    path : '../../python/server.py',
    url : 'http://localhost:5000'
  },
  logDebugMode : 'true',
  logsPath : '/tmp/flaskserver.log',
  splash_path : '/../../resources/templates/splash_page.html'
};
