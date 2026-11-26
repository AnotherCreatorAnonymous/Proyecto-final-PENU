const { app: azureApp } = require('@azure/functions');
const serverless = require('serverless-http');
const expressApp = require('../index');

const handler = serverless(expressApp);

azureApp.http('apiProxy', {
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    authLevel: 'anonymous',
    route: '{*segments}',
    handler: async (request, context) => {
        const bodyBuffer = request.body ? Buffer.from(await request.arrayBuffer()) : undefined;

        const event = {
            httpMethod: request.method,
            path: new URL(request.url).pathname,
            headers: Object.fromEntries(request.headers.entries()),
            queryStringParameters: Object.fromEntries(new URL(request.url).searchParams.entries()),
            body: bodyBuffer ? bodyBuffer.toString('utf8') : undefined,
            isBase64Encoded: false,
        };

        const result = await handler(event, context);

        return {
            status: result.statusCode,
            headers: result.headers,
            body: result.body,
        };
    },
});