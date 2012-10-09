var twitterHandlers = require("./twitter-handlers.js");


var OzoneHandlers = function() {
    var tweets= function(req, res) {
    	twitterHandlers.getHtmlTweets(req.params.query, function(err,reply){
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

    var breakingNews = function(req, res) {

        twitterHandlers.getBreakingNews(function(err, reply){

            if(err !== null){
                console.log("Error on OzoneHandlers.tweets()" + err);
                res.end("No tweets found at this time.");
            }
            else{
                var tweetToHTML = "";
                for (key in reply.results){
                    tweetToHTML += "@"+reply.results[key].from_user +": "+reply.results[key].text+"... ";
                }
                //tweetToHTML += "</p>";
                res.end(tweetToHTML);
            }
        });
    }



    return {
        tweets: tweets,
        breakingNews: breakingNews,
    }
}();

module.exports = OzoneHandlers;