/**
 * Created by vladi on 05-May-17.
 */
const bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    session = require('express-session'),
    MemoryStore = session.MemoryStore;

const configureCors = (app) => {
    app.use(function (req, res, next) {
        res.header('Access-Control-Allow-Credentials', true);
        res.header('Access-Control-Allow-Origin', req.headers.origin);
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
        //intercepts OPTIONS method
        if ('OPTIONS' === req.method) {
            //respond with 200
            res.send(200);
        }
        else {
            //move on
            next();
        }
    });
};

const configureSession = (app) => {
    //express needs help to parse post body requests... cuase reasons
    app.use(bodyParser.json());
    app.use(cookieParser());
    app.use(session({
        name: 'app.sid',
        secret: "1234567890QWERTY",
        resave: true,
        store: new MemoryStore(),
        saveUninitialized: true
    }));
};


module.exports = {
    configureCors: configureCors,
    configureSession: configureSession
};