var glossary = require("glossary")({
    collapse: true,
    blacklist: ["rt", "http", "www"]
});

var TwitterHandler = function(dbModel) {
    var keywordsModel = dbModel;

    // Load nTwitter Library for easy Twitter API access.
    var twitter = require("ntwitter");
    var tconf = require("../conf/twitconf");
    var twit = new twitter(tconf.getConf());

    var request = require("request");

    var latestTweetWithLoc = null;

    // Store the stream object at the module scope.
    var twitterStream = null;

    var sentRecently = false;
    var dbProcessing = false;
    var numDroppedSinceLastStore = 0;

    var events = require('events');
    var localEmitter = new events.EventEmitter();

    var currentKeywordsString = '';
    var currentKeywordsArray = [];

    var tweetToWordsArray = function(inString){
        var urlRegEx = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

        var text = inString
            .replace(/RT\s@(\S+)\s/ig, '')     // Remove "RT @xxxx" (retweet) tags
            .replace(/&(\w+);/ig, '')          // Remove HTML entities
            .replace(/\s([0-9]+)\s/ig, '')     // Remove single numbers (not meaningful to us...)
            .replace(urlRegEx, '')             // Remove Hyperlinks
            .replace(/\W/ig, ' ');             // Remove non-alphanumeric characters

        return glossary.extract(text);
    };


    var startStreamToClient = function(req, res) {
        console.log("INFO: Stream to Client Started.");

        // Setup an Event-Stream to Client
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        res.write('\n');

        if(!twitterStream) {
            // Nothing coming from Twitter, so
            // close the stream to the client.
            res.end();
        } else {
            // Used to rate-limit sending of events to the client.
            var sentRecently = false;

            // Each time a tweet comes in, the 'data' event fires.
            twitterStream.on('data', function(t) {
                // Check to be sure rate-limit flag isn't set.
                if(!sentRecently) {
                    // Only compile the information we need to send
                    // (Tweet objects are huge!)
                    var smallTweet = {
                        "user": t.user.name,
                        "img_url": t.user.profile_image_url,
                        "coordinates": t.coordinates,
                        "text": t.text
                    };

                    // Send Data to Client
                    res.write("data: " + JSON.stringify(smallTweet) + '\n\n');

                    // Rate Limiting
                    sentRecently = true;
                    setTimeout(function() {
                        sentRecently = false;
                    }, 5000);
                }
            });

            // Queue up the action for when we lose Client Connection
            req.on("close", function() {
                console.log("INFO: Received Browser Close Event. Shutting Down Sever End of Stream To Client.");
                res.end();
            });
        }
    };


    var startStreamFromTwitter = function() {
        // Build the Keywords String from the active keywords in the DB
        keywordsModel
            .find({isActive: true})
            .sort({keyword: 1})
            .exec(function(err, results) {
                var newKeywords = [];
                for(var i in results) newKeywords.push(results[i].keyword);
                localEmitter.emit('keywordsStringUpdated', newKeywords.join());
            });

        localEmitter.once('keywordsStringUpdated', function(keywordsString){
            if(keywordsString === '') {
                // No keywords for Twitter.
                console.error("ERROR: No Keywords. Can't start/continue Twitter Stream.");

                // Shut down Twitter Stream if it exists.
                if(twitterStream) twitterStream.destroy();

            } else if((keywordsString === currentKeywordsString) && twitterStream) {
                console.info("INFO: Keywords Unchanged. No need to restart stream from Twitter.");
                return;

            } else {
                // Store the New Keywords
                currentKeywordsString = keywordsString;
                currentKeywordsArray = keywordsString.split(',');

                // Close the old connection.
                if(twitterStream) twitterStream.destroy();

                // Build the connection to Twitter
                twit.stream('statuses/filter', {
                    track: currentKeywordsString
                }, function(stream) {
                    // Save the stream variable into a higher scope.
                    twitterStream = stream;

                    stream.on('error', function(data, details) {
                        console.error("ERROR: Twitter streamEmitter Error -> ", data, details);
                        if(twitterStream) twitterStream.destroy();
                    });

                    stream.on('data', function(t) {
                        if(t.text && (dbProcessing === false)) {
                            // If this tweet has location info, store it for the Maps feature.
                            if(t.coordinates || t.user.location) {
                                latestTweetWithLoc = t;
                            }

                            var tweetWordsArray = tweetToWordsArray(t.text);

                            // For sanity, only allow one DB call at a time
                            // (i.e. drop tweets that come in while we're still storing
                            //  this one...)
                            dbProcessing = true;
                            numDroppedSinceLastStore = 0;

                            // Find the keywords this was for.
                            for(var i in currentKeywordsArray){
                                // If the keyword is in this tweet, store the tweet in this keyword's bank.
                                for(var j in tweetWordsArray) {
                                    if(tweetWordsArray[j] == currentKeywordsArray[i]) {
                                        keywordsModel.addText(currentKeywordsArray[i], tweetWordsArray);
                                        break;
                                    }
                                }
                            }

                            // DB store operation completed, allow another tweet to come in.
                            dbProcessing = false;


                        } else {
                            numDroppedSinceLastStore++;
                            if(dbProcessing) console.log("INFO: Tweet Dropped -- " + numDroppedSinceLastStore +
                                " dropped since last tweet stored.");
                            else console.log(t);
                        }
                    });

                    stream.on('limit', function(limit) {
                        console.log(limit);
                    });
                });

                console.log("INFO: Stream from Twitter Started.");
                localEmitter.emit('streamFromTwitterActive');
            }
        });
    };

    var getGeoTweet = function(req, res) {
        var t = latestTweetWithLoc;

        // Until a tweet with location comes in, we can't continue.
        if(!t) {
            console.log("INFO: GeoTweet Unavailable.");
            res.end();
            return;
        }

        try {
            if(t.coordinates) {
                // If we have Lat/Long, Reverse Geocode w/ Google to get a Proper Address
                latLng = t.coordinates.coordinates[1] + ',' + t.coordinates.coordinates[0];
                request('http://maps.googleapis.com/maps/api/geocode/json?latlng=' + latLng + '&sensor=false', function(error, response, body) {
                    resultsJSON = JSON.parse(body);
                    if(resultsJSON.status == 'OK') {
                        t.address = resultsJSON.results[0].formatted_address;
                        res.end(JSON.stringify(t));
                        t = null;
                        console.log("INFO: Sent GeoTweet.");
                    } else {
                        console.log("ERROR: Geocode Error -> ", resultsJSON);
                    }
                });
            } else if(t.user.location) {
                // If we only have an address (or City/State), Geocode w/ Google for a lat/Long
                request('https://maps.googleapis.com/maps/api/geocode/json?address=' + t.user.location + '&sensor=false', function(error, response, body) {
                    if(error) console.error(error);
                    resultsJSON = JSON.parse(body);
                    if(resultsJSON.status == 'OK') {
                        // Add a little variance so the placemarks don't stack.
                        lat = resultsJSON.results[0].geometry.location.lat + (Math.random() - 0.5) / 2;
                        lng = resultsJSON.results[0].geometry.location.lng + (Math.random() - 0.5) / 2;
                        t.coordinates = {
                            "coordinates": [lng, lat],
                            "type": "point"
                        };
                        t.address = resultsJSON.results[0].formatted_address;
                        res.end(JSON.stringify(t));
                        t = null;
                        console.log("INFO: Sent GeoTweet.");
                    } else {
                        console.log("ERROR: Geocode Error -> ", resultsJSON);
                    }

                });
            } else {
                res.end();
            }
        } catch(err) {
            console.error(err);
        }
    };

    return {
        startStreamFromTwitter: startStreamFromTwitter,
        startStreamToClient: startStreamToClient,
        getGeoTweet: getGeoTweet
    };
};

module.exports = TwitterHandler;