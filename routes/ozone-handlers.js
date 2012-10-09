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
                console.log("Error on OzoneHandlers.breakingNews()" + err);
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

    var streamTweets = function(req,res){
        console.log("streamTweets hit.");
        req.socket.setTimeout(0);
        var topic = req.params.topic;
        var stream = twitterHandlers.getStream(topic);

        stream.on('tweet', function (tweet) {
            //console.log(tweet);
            res.write("data: " + tweet.text + '\n\n'); // Note the extra newline
           
        });
          //send headers for event-stream connection
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });
        res.write('\n');
        }



        return {
            tweets: tweets,
            breakingNews: breakingNews,
            streamTweets: streamTweets,
        }
}();

module.exports = OzoneHandlers;