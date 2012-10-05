var twitterHandlers = require("./twitter-handlers.js");


var OzoneHandlers = function() {
    var tweets= function(req, res, callback) {
    	twitterHandlers.getTweets(req.params.query, function(err,reply){
    		if(err !== null){
    			console.log("Error on OzoneHandlers.tweets()" + err);
    			res.end("sorry 404");
    		}
    		else{
    			var html = "<html><body>adding some stuff."+reply+"</body></html>"; 
        		res.end(html);
        	}
    	});
        
    }

    return {
        tweets: tweets,
       
    }
}();

module.exports = OzoneHandlers;