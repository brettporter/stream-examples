var http = require('http');
var fs = require('fs');

var port = process.env['PORT'] || 8000

var health = function(req, res, callback) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write('ok');
  res.end();
  callback(req);
}

var readTimeoutHeader = function(req) {
  return req.headers['x-delay'] || 20000;
}

var slowStart = function(req, res, callback) {
  var timeout = readTimeoutHeader(req);
  console.log("Timeout", timeout);
  setTimeout(function() {
    health(req, res, callback);
  }, timeout);
}

var slowResponse = function(req, res, callback) {
  var timeout = readTimeoutHeader(req);
  console.log("Timeout", timeout);
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write('ready.');
  setTimeout(function() {
    res.write('set.');
    res.write('go.');
    res.end();
    callback(req);
  }, timeout);
}

var streamBigFile = function(req, res, callback) {
  var stat = fs.statSync('bigfile.img');

  res.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Content-Length': stat.size
  });

  console.log("Sending bigfile.img");
  var stream = fs.createReadStream('bigfile.img');
  stream.pipe(res);

  stream.on('end', function() {
    callback(req);
  })
}

var streamPartial = function(req, res, callback) {
  var stat = fs.statSync('bigfile.img');

  res.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Content-Length': stat.size
  });

  res.write('not even a sultana');
  res.end();
  callback(req);
}

var dropConnection = function(req, res, callback) {
  console.log("DESTROY!!!", req.url);
  req.destroy();
  callback(req);
}

var dropConnectionAfterHead = function(req, res, callback) {
  console.log("DESTROY!!!", req.url);
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write('ready...');
  req.destroy();
  callback(req);
}

var conflict = function(req, res, callback) {
  res.writeHead(409);
  res.end();
  callback(req);
}

var conflictAtEnd = function(req, res, callback) {
  req.resume();
  req.on('end', function() {
    res.writeHead(409);
    res.end();
    callback(req);
  })
}

var putFile = function(req, res, callback) {
  console.log("Saving as server-outfile.tmp");
  var stream = fs.createWriteStream('server-outfile.tmp');
  req.pipe(stream);
  req.on('end', function() {
    res.writeHead(201);
    res.end();
    callback(req);
  })
}

var putPartial = function(req, res, callback) {
  req.setEncoding('utf8');

  req.on('data', function(chunk) {
    console.log("READ", chunk.length);
    req.pause();
  });

  req.on('end', function() {
    res.end();
    callback(req);
  });
}

http.createServer(function (req, res) {
  console.log("REQUESTED", req.method, req.url);

  var done = function(req) {
    console.log("RESPONDED", req.url)
  }

  req.on('close', function() {
    console.log("REQUEST CLOSED");
  })

  req.on('end', function() {
    console.log("REQUEST END");
  })

  req.on('error', function(error) {
    console.error("REQUEST ERROR", error);
  })

  if (req.method == 'GET' || req.method == 'HEAD') {
    switch (req.url) {
      case '/':
      case '/health':
        health(req, res, done);
        break;
      case '/slowStart':
        slowStart(req, res, done);
        break;
      case '/slowResponse':
        slowResponse(req, res, done);
        break;
      case '/streamBigFile':
        streamBigFile(req, res, done);
        break;
      case '/streamPartial':
        streamPartial(req, res, done);
        break;
      case '/dropConnection':
        dropConnection(req, res, done);
        break;
      case '/dropConnectionAfterHead':
        dropConnectionAfterHead(req, res, done);
        break;
      default:
        res.writeHead(404);
        res.end();
        done(req);
    }
  }
  else if (req.method == 'PUT') {
    switch (req.url) {
      case '/conflict':
        conflict(req, res, done);
        break;
      case '/conflictAtEnd':
        conflictAtEnd(req, res, done);
        break;
      case '/putFile':
        putFile(req, res, done);
        break;
      case '/putPartial':
        putPartial(req, res, done);
        break;
      case '/dropConnection':
        dropConnection(req, res, done);
        break;
      case '/dropConnectionAfterHead':
        req.resume();
        dropConnectionAfterHead(req, res, done);
        break;
      case '/slowStart':
        req.resume();
        slowStart(req, res, done);
        break;
      case '/slowResponse':
        req.resume();
        slowResponse(req, res, done);
        break;
      default:
        res.writeHead(404);
        res.end();
        done(req);
    }
  }
  else {
    res.writeHead(405);
    res.end();
    done(req);
  }
}).listen(port);
