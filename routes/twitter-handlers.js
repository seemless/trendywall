var twit = require("twit");
var tconf = require("../conf/twitconf"); //config file for twitter
var twitter = new twit(tconf.getConf());

var TweetHandlers = function() {
    var getTweets= function(queryParam) {
        var html = "<html><body>"+queryParam+"</body></html>"; 
        return html;
    }

    return {
        getTweets: getTweets,
       
    }
}();

module.exports = TweetHandlers;