var http = require('http');
var fs = require('fs');

var path = process.argv[2];
var method = process.argv[3];

if (path === undefined) {
  path = 'health';
}

if (method === undefined) {
  method = 'GET';
}

var url = 'http://localhost:8000/' + path;
var options = require('url').parse(url);
options.method = method;

console.log("Requesting", options);
request = http.request(options, function(response) {
  response.on('end', function() {
    console.log("RESPONSE END");
  })

  response.on('error', function(error) {
    console.error("RESPONSE ERROR", error);
  })

  console.log("Code", response.statusCode);

  if (method == 'GET') {
    console.log("Saving to client-outfile.tmp...");
    var stream = fs.createWriteStream('client-outfile.tmp');
    response.pipe(stream);
  }
  else {
    response.pipe(process.stdout);
  }
});

request.on('close', function() {
  console.log("REQUEST CLOSE");
})

request.on('end', function() {
  console.log("REQUEST END");
})

// Alternative for timeout, same thing:
// request.on('socket', function(socket) {
//   socket.setTimeout(1000);
//   socket.on('timeout', function(timeout) {
//     console.log("SOCKET TIMEOUT");
//     socket.destroy();
//   })
// })

request.setTimeout(1000);
request.on('timeout', function() {
  console.log("REQUEST TIMEOUT");
  request.abort();
})

request.on('error', function(error) {
  console.error("REQUEST ERROR", error);
})

if (method == 'PUT') {
  console.log("Posting bigfile.img...");
  var stream = fs.createReadStream('bigfile.img');
  stream.pipe(request);
}
else {
  request.end();
}
