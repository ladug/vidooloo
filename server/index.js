const express = require('express'),
    serverConfig = require('./serverConfig'),
    routes = require('./routes'),
    app = express();

//configure server
app.set('port', 3001);
serverConfig.configureCors(app);
serverConfig.configureSession(app);

// initiate routes
routes.forEach(route => {
    if (!route || !route.url || !Array.isArray(route.handlers)) {
        return; //skip broken
    }
    app[route.method].apply(app, [route.url].concat(route.handlers));
});

//server 404 error will end up here
app.use(function (req, res, next) {
    console.log("404");
    res.send(404, {title: '404 Not Found'});
});

const server = app.listen(app.get('port'), function (err) {
    if (err) throw err;
    console.log('AwsomeServer is running @ http://localhost:' + server.address().port);
});
