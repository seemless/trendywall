var TwitterHandler = require("./twitterHandler.js");
var OzoneHandler = function (){
  var twitterStream = function(req, res){
    TwitterHandler.getStream(req,res);
  };

  return {
    twitterStream: twitterStream
  };
};

exports.handler = OzoneHandler;