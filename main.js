'use strict';

const http = require('http');
const port = 9999;
const statusNotFound = 404;
const statusBadRequest = 400;
const statusOk = 200;

let nextId = 1;
const posts = [];

function sendResponse(response, {status = statusOk, headers = {}, body = null}) {
    Object.entries(headers).forEach(function([key, value]){
        response.setHeader(key, value);
    });
    response.writeHead(status);
    response.end(body);
}

function sendJSON(response, body) {
    sendResponse(response, {
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
}

const methods = new Map();
methods.set('/posts.get', function({response}){
    const savedPosts = posts.filter(post => !post.removed);
    sendJSON(response, savedPosts);
});

methods.set('/posts.getById', function({response, searchParams}){
    if (!searchParams.has('id') || isNaN(Number(searchParams.get('id')))){
        sendResponse(response, {status: statusBadRequest});
        return;
    } 
    // else if (searchParams.get('id').isNaN()){
    // }
    const id = Number(searchParams.get('id'));
    // console.log(id);
    for (const post of posts) {
        // console.log(post.id);
        if (!post.removed && post.id === id){
            sendJSON(response, post);
            return;
        }
    }
    sendResponse(response, {status: statusNotFound});
});

methods.set('/posts.post', function({response, searchParams}){
    if (!searchParams.has('content')){
        sendResponse(response, {status: statusBadRequest});
        return;
    }

    const content = searchParams.get('content');
    const post = {
        id: nextId++,
        content: content,
        created: Date.now(),
        removed: false,
    };

    posts.unshift(post);
    sendJSON(response, post);
});

methods.set('/posts.edit', function({response, searchParams}){
    if (!searchParams.has('id') || isNaN(Number(searchParams.get('id'))) || !searchParams.has('content')){
        sendResponse(response, {status: statusBadRequest});
        return;
    }

    const id = Number(searchParams.get('id'));
    const updatedContent = searchParams.get('content');
    
    for (const post of posts) {
        if (!post.removed && post.id === id){
            post.content = updatedContent;
            sendJSON(response, post);
            return;
        }
    }
    sendResponse(response, {status: statusNotFound});
});

methods.set('/posts.delete', function({response, searchParams}){
    if (!searchParams.has('id') || isNaN(Number(searchParams.get('id')))){
        sendResponse(response, {status: statusBadRequest});
        return;
    }
    const id = Number(searchParams.get('id'));
    const postIndex = posts.findIndex((post) => post.id === id);
    if (postIndex !== -1 && !posts[postIndex].removed){
        const post = posts[postIndex];
        post.removed = true;
        sendJSON(response, post);
        return;
    }
    sendResponse(response, {status: statusNotFound});
});

methods.set('/posts.restore', function({response, searchParams}){
    if (!searchParams.has('id') || isNaN(Number(searchParams.get('id')))){
        sendResponse(response, {status: statusBadRequest});
        return;
    }

    const id = Number(searchParams.get('id'));
    const postIndex = posts.findIndex((post) => post.id === id);
    if (postIndex !== -1){
        const post = posts[postIndex];

        if (!post.removed){
            sendResponse(response, {status: statusBadRequest});
            return;
        }

        post.removed = false;
        sendJSON(response, post);
        return;
    }
    sendResponse(response, {status: statusNotFound});
});

const server = http.createServer((request, response) => {
    const {pathname, searchParams} = new URL(request.url, `http://${request.headers.host}`);
    
    const method = methods.get(pathname);
    if (method === undefined){
        sendResponse(response, {status: statusNotFound});
        return;
    }

    const params = {
        request,
        response,
        pathname,
        searchParams,
    };

    method(params);
});

server.listen(port);