var http = require('http');
var fs = require('fs');
var async = require('async');

var url = process.argv[2];
var method = process.argv[3];

if (url === undefined) {
  url = 'http://localhost:8000/health';
}

if (method === undefined) {
  method = 'GET';
}

var partialWrite = process.env['PARTIAL_WRITE'] || false;
var numRequests = process.env['NUM_REQUESTS'] || 1;
var maxSockets = process.env['MAX_SOCKETS'];
var disableAgent = process.env['DISABLE_AGENT'] || false;

if (maxSockets !== undefined) {
  http.globalAgent.maxSockets = maxSockets;
}

var doRequest = function(count, callback) {
  var options = require('url').parse(url);
  options.method = method;
  if (disableAgent) {
    options.agent = false;
  }

  console.log("Requesting", count, method, url);
  request = http.request(options, function(response) {
    response.on('end', function() {
      console.log(count, "RESPONSE END");
      callback(null);
    })

    response.on('error', function(error) {
      console.error(count, "RESPONSE ERROR", error);
    })

    console.log(count, "Code", response.statusCode);

    if (method == 'GET') {
      console.log(count, "Saving to client-outfile.tmp...");
      var stream = fs.createWriteStream('client-outfile.tmp');
      response.pipe(stream);
    }
    else {
      response.pipe(process.stdout);
    }
  });

  request.on('close', function() {
    console.log(count, "REQUEST CLOSE");
  })

  request.on('end', function() {
    console.log(count, "REQUEST END");
  })

  // Alternative for timeout, same thing:
  // request.on('socket', function(socket) {
  //   socket.setTimeout(1000);
  //   socket.on('timeout', function(timeout) {
  //     console.log("SOCKET TIMEOUT");
  //     socket.destroy();
  //   })
  // })

  request.setTimeout(10000);
  request.on('timeout', function() {
    console.log(count, "REQUEST TIMEOUT");
    request.abort();
  })

  request.on('error', function(error) {
    console.error(count, "REQUEST ERROR", error);
    callback(null);
  })

  if (method == 'PUT') {
    if (partialWrite) {
      console.log(count, "Partial write...");
      request.write("ready...");
      // no request.end();
    } else {
      console.log(count, "Posting bigfile.img...");
      var stream = fs.createReadStream('bigfile.img');
      stream.pipe(request);
    }
  }
  else {
    request.end();
  }
}

// TODO: limit concurrent
async.times(numRequests, doRequest, function(err, results) {
  console.log("DONE");
});
