var twit = require("twit");
var tconf = require("../conf/twitconf"); //config file for twitter
var twitter = new twit(tconf.getConf());

var TweetHandlers = function() {
    var getHtmlTweets= function(queryParam,callback) {
    	var tweetToHTML = "";
        twitter.get('search', { q: queryParam, result_type: 'mixed', geocode:"39.4,-76.6,1000mi", lang: 'en', page:1, rpp:12 }, function(err, reply) {
        	
        	if (err!==null){
            	console.log("Errors:",err);
            	callback(err,null);
            }
            else{
            	for (key in reply.results){
					tweetToHTML += "<div style='border-bottom:1px solid #777; padding-bottom:10px; display:block; position:relative;'>\
                	<a class><img width='48' height='48' src='"+reply.results[key].profile_image_url+"' style='float:left; background: black; border-top: 1px solid #333;\
                	border-left: 1px solid #333; border-bottom: 1px solid #666; border-right: 1px solid #666;'/></a>\
                	<div style='display:block; margin-left:60px;'><p>"+reply.results[key].text+"</p>\
                	<b>"+reply.results[key].from_user+"</b> - "+reply.results[key].location+"</div>\
                	</div>";
                }

                callback(null,tweetToHTML);
            }
        });
        
    }

    var getJsonTweets = function(queryParam,callback) {
        var tweetToHTML = "";
        twitter.get('search', { q: queryParam, result_type: 'mixed', geocode:"39.4,-76.6,1000mi", lang: 'en', page:1, rpp:12 }, function(err, reply) {
            
            if (err!==null){
                console.log("Errors:",err);
                callback(err,null);
            }
            else{
                callback(reply.results,null);
            }
        }
    }
    var getBreakingNews = function(callback){
        twitter.get('search', { q: "BreakingNews", result_type: 'recent', lang: 'en', page:1, rpp:8 }, function(err, reply) {
            if (err!==null){
                console.log("Errors:",err);
                callback(err,null);
            }
            else{
                var tweetToHTML = "";
                for (key in reply.results){
                    tweetToHTML += "@"+reply.results[key].from_user +": "+reply.results[key].text+"... ";
                }
                //tweetToHTML += "</p>";
                callback(null,tweetToHTML);
            }
        });
    }

    return {
        getHtmlTweets: getHtmlTweets,
        getJsonTweets: getJsonTweets,
        getBreakingNews: getBreakingNews,
       
    }
}();

module.exports = TweetHandlers;