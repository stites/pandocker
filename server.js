var express       = require("express");
var app           = express();
var port          = 3000;

var targz    = require('tar.gz');
var async    = require('async');
var jandoc   = require('jandoc');
var fs       = require('fs');
var mkdirp   = require('mkdirp');
var rmdir    = require('rimraf');

app.use(express.bodyParser());
app.use(express.static(__dirname + '/public'));

app.listen(port);

var temp   = __dirname + '/temp';
// var output = temp + '/files';

app.post('/upload', function(req, res) {
  var filePath     = req.files.files.path;
  var fileName     = req.files.files.name.split('.')[0];
  var newFileDir   = fileName.replace(/ /g, '_');
  var extensions   = req.body.data;
  var tmpDirectory = temp + '/' + newFileDir;

  async.waterfall([
    function(cb){
      mkdirp(tmpDirectory, cb);

    }, function(made, cb){
      console.log(made);
      fs.readFile(filePath, cb);

    }, function(fileContents, cb){
      processFile(filePath,
                  fileContents,
                  extensions,
                  fileName,
                  tmpDirectory,
                  cb);

    }], function(err, fileName){
      if (err) { console.error('shit\'s crazy!') }
      // res.send('success ' + fileName);
      res.sendfile(fileName)

    });
});

var processFile = function(path, data, extensions, name, tempDir, cb) {

  fs.writeFile(path, data, function(err) {
    if (err) { console.log(err); }
    else {
      extensions  = JSON.parse(extensions);
      var arr     = path.split('/');
      var oldName = arr[arr.length-1].split('.')[0]; // string created by fs

      async.each(extensions, function(val, cb){
        jandoc.cmd( '-d ' + path + ' -o ' + tempDir + ' --write ' + val,
                    function(err){
                      fs.rename(tempDir + '/' + oldName + '.' + val,
                                tempDir + '/' + name    + '.' + val,
                                cb);
                    }
        );
      }, function(err) {
          if( err ) { console.error(err +'\nA file failed to process'); }
          else {
            async.waterfall([
              function(cb){
                new targz().compress( tempDir, name+'.tar.gz', function(err){
                  cb(err, name+'.tar.gz')
                });

              }, function(gzipName, cb){
                deleteDirectories(function(err){
                  console.log('temp dir removed!');
                  cb(err, gzipName);
                });

              },

            ], cb);
          }
      });
    }
  });
};

var deleteDirectories = function(cb) {
  rmdir(temp, cb);
}
