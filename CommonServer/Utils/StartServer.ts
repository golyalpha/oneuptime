import './Envrionment';
import './Process';
import logger from './Logger';
import cors from 'cors';

import Express, {
    ExpressRequest,
    ExpressResponse,
    NextFunction,
    ExpressJson,
    ExpressUrlEncoded,
    ExpressApplication,
    RequestHandler,
} from './Express';

// Connect common api's.
import CommonAPI from '../API/Index';

import OneUptimeDate from 'Common/Types/Date';
import LocalCache from '../Infrastructure/LocalCache';
import Exception from 'Common/Types/Exception/Exception';

const app: ExpressApplication = Express.getExpressApp();

app.set('port', process.env['PORT']);

const logRequest: RequestHandler = (
    req: ExpressRequest,
    res: ExpressResponse,
    next: NextFunction
): void => {
    const formatted_date: string =
        OneUptimeDate.getCurrentDateAsFormattedString();

    const method: string = req.method;
    const url: string = req.url;
    const status: number = res.statusCode;

    const log: string = `[${formatted_date}] ${method}:${url} ${status}`;
    logger.info(log);
    next();
};

const setDefaultHeaders: RequestHandler = (
    req: ExpressRequest,
    res: ExpressResponse,
    next: NextFunction
): void => {
    if (typeof req.body === 'string') {
        req.body = JSON.parse(req.body);
    }
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Origin', req.headers['origin']);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header(
        'Access-Control-Allow-Headers',
        'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept,Authorization'
    );

    next();
};

app.use(cors());
app.use(setDefaultHeaders);



/*
 * Add limit of 10 MB to avoid "Request Entity too large error"
 * https://stackoverflow.com/questions/19917401/error-request-entity-too-large
 */

app.use(ExpressJson({ limit: '10mb' }));
app.use(ExpressUrlEncoded({ limit: '10mb' }));


// Error Handler. 
app.use((err: Error, _req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    
    logger.error(err);

    if (res.headersSent) {
        return next(err)
    }

    if (err instanceof Exception) {
        res.status((err as Exception).code)
        res.send({ error: (err as Exception).message })
    } else {
        res.status(500)
        res.send({ error: err });
    }

});

app.use(logRequest);

export default async (appName: string) => {
    await Express.launchApplication(appName);
    LocalCache.setString("app", "name", appName);
    CommonAPI(appName);
    return app;
};
