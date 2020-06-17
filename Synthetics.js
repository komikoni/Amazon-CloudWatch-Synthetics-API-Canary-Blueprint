const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');
const https = require('https');
const http = require('http');
const querystring = require('querystring');

const request = async ({ url, method = 'GET', auth, headers = {}, postData } = {}) => {
    const parseUrl = new URL(url);
    const httpx = parseUrl.protocol === 'https:' ? https : http;
    if (headers['User-Agent']) headers['User-Agent'] = synthetics.getCanaryUserAgentString();
    const params = {
        hostname: parseUrl.hostname,
        path: `${parseUrl.pathname}${parseUrl.search}`, // without hash(#)
        method,
        auth,
        headers,
    };

    return new Promise((resolve, reject) => {
        const req = httpx.request(params, res => { // https.request(url[, options][, callback]) is not work
            const message = `Status Code: ${res.statusCode} url: ${url} method: ${method}`;
            if (res.statusCode !== 200) {
                log.error(message);
                return reject(new Error(message));
            } else {
                log.info(message);
            }
            const data = [];

            res.on('data', chunk => {
                data.push(chunk);
            });
            res.on('end', () => resolve(Buffer.concat(data).toString()));
        });
        req.on('error', err => reject(err));
        if (postData) {
            req.write(postData);
        }
        req.end();
    });
};

const apiCanaryBlueprint = async () => {
    const AUTH_CLIENT_URL = 'http://example.com/oauth2/token';
    const AUTH_CLIENT_ID = 'ClientId';
    const AUTH_CLIENT_SECRET = 'ClinetSecret';
    const TARGET_URL = "http://example.com/test";

    // request 1
    const authRequestParam = {
        url: AUTH_CLIENT_URL,
        method: 'POST',
        auth: `${AUTH_CLIENT_ID}:${AUTH_CLIENT_SECRET}`,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        postData: querystring.stringify({
            grant_type: 'client_credentials'
        })
    };
    const tokenString = await request(authRequestParam);
    const token = JSON.parse(tokenString);
    // request 2
    const targetRequestParam = {
        url: TARGET_URL,
        headers: {
            "Authorization": `Bearer ${token.access_token}`
        }
    };
    const response = await request(targetRequestParam);
    return "Success";
};

exports.handler = async () => {
    return await apiCanaryBlueprint();
};
