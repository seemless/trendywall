var DEBUG = false;

var express = require("express");
var app = express();

var request = require("request"); //for doing http gets.. in this case to get google top 10
var Flickr = require('flickr').Flickr;
var fconf = require("./conf/flickrconf");
var flickrKey = fconf.getConf()['consumer_key'];
var flickrSecret = fconf.getConf()['consumer_sercret'];
var flickr = new Flickr(flickrKey, flickrSecret);

var NUM_WORDS_IN_CLOUD = 50;


// Database Setup
var mongoose = require('mongoose');
var db = mongoose.createConnection("localhost", "test");
if(DEBUG) mongoose.set('debug', true);
db.on('error', console.error.bind(console, 'connection error.'));

// Schemas
var WordSchema = new mongoose.Schema({
    // Mongoose only provides access via the _id field,
    // so that's where we store the word.
    _id: 'string',
    count: { type: 'number', default: 1 }
});

var KeywordSchema = new mongoose.Schema({
    keyword: 'string',
    isActive: 'boolean',
    wordbank: [WordSchema]
});


// DB Model Methods
// Pass in array of words/phrases to store.
KeywordSchema.methods.addText = function (textToStore, cb) {
    // Store Words in DB
    for(var i in textToStore) {
        var doc = this.wordbank.id(textToStore[i]);
        if(doc) {
            doc.count++;
            this.save();
        } else {
            this.wordbank.push({
                _id: textToStore[i]
            });
            this.save();
        }
    }

    // If we got passed a callback, call it.
    if(cb) {
        cb();
    }
};


KeywordSchema.statics.activateKeywords = function (keywords, cb) {
    for(var i in keywords) {
        this.update({
            keyword: keywords[i]
        }, {
            isActive: true
        }, {
            upsert: true
        }, function (err){
            if(err) console.log(err);
        });
    }

    if(cb) {
        cb();
    }
};

KeywordSchema.statics.deactivateKeywords = function (keywords, cb) {
    for(var i in keywords) {
        this.update({
            keyword: keywords[i]
        }, {
            isActive: false
        }, {
            upsert: false
        }, function (err){
            if(err) console.log(err);
        });
    }

    if(cb) {
        cb();
    }
};


KeywordSchema.statics.getHighestCountWords = function (cb, numWords) {
    numWords = typeof numWords !== 'undefined' ? a : 50; // Default 50 words if not passed in.
    out = [];

    this.aggregate(
        { $match: {isActive: true} },
        { $unwind: "$wordbank" },
        { $project: {word: '$wordbank._id', count: '$wordbank.count'} },
        { $sort: {count: -1} },
        { $limit: numWords },
        function (err, res) {
            if(err) console.error(err);

            for(var i in res) {
                out.push({
                    text: res[i].word,
                    weight: res[i].count
                });
            }

            cb(out);
        }
    );
};

KeywordSchema.statics.getActiveKeywords = function(cb){
    var out = [];
    this.find({isActive: true}, function(err, res){
        for(var i in res){
            out.push(res[i].keyword);
        }

        cb(out);
    });
};

var KeywordsModel = db.model('Keyword', KeywordSchema);

var twitter = require("./handlers/twitterHandler.js")(KeywordsModel);
var ozone = require("./handlers/ozoneHandler.js");


// Setup
app.configure(function () {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
});


// Serve static files
app.use("/static", express.static(__dirname + '/static'));

// TODO: Do better than this...
app.get("/googleTopWorldNews", function (req, res) {
    request('http://news.google.com/news/section?pz=1&cf=all&ned=us&topic=w&output=html', function (error, response, body) {
        if(!error && response.statusCode == 200) {
            res.end(body); // Print the google world news webpage
        }
    });
});

app.all('/twitterStream', function (req, res) {
    twitter.startStreamToClient(req, res);
    twitter.startStreamFromTwitter();
});

app.all("/getGeoTweet", function (req, res) {
    twitter.getGeoTweet(req, res);
});

app.get("/news", function (req, res) {
    // twitter.get('search', {
    //     q: "BreakingNews",
    //     result_type: 'recent',
    //     lang: 'en',
    //     page: 1,
    //     rpp: 8
    // }, function(err, reply) {
    //     if(err !== null) {
    //         console.log("Errors:", err);
    //     } else {
    //         var tweetToHTML = "";
    //         for(var key in reply.results) {
    //             tweetToHTML += "@" + reply.results[key].from_user + ": " + reply.results[key].text + "... ";
    //         }
    //         //tweetToHTML += "</p>";
    //         res.end(tweetToHTML);
    //     }
    // });
});

app.get("/trendywall", function (req, res) {
    res.render("trendywall.ejs", {
        layout: false
    });
});


app.get("/flickr/:query/:tagMode", function (req, res) {
    var pixel_map = {
        "s": "75",
        "q": "150",
        "t": "100",
        "m": "240",
        "n": "320",
        "-": "500",
        "z": "640",
        "c": "800",
        "b": "1024",
        "o": "500"
    };

    var mode = req.params['tagMode'];
    console.log("mode:" + mode);
    //Only valid tag_modes are 'any' or 'all', default to 'any'
    if(mode !== "all" || mode !== "any") {
        mode = "any";
    }


    var query = unescape(req.param('query')).split(',');
    console.log(query);
    flickr.executeAPIRequest("flickr.photos.search", {
        tags: query,
        tag_mode: mode
    }, true, function (err, reply) {

        if(err !== null) {
            console.log("errors in getting flickr photos" + err);
        } else {
            var picsToHTML = '';
            var imgTagBeg = "<img src='";
            var imgTagEndOne = "' class='active' style='display: none;'/>";
            var imgTagEngOther = "' />";
            var i = 0;
            if(reply.photos.total < 100) {
                i = reply.photos.total;
            } else {
                i = 100;
            }
            for(var k = 0; k < i; k++) {
                //http://farm{farm-id}.staticflickr.com/{server-id}/{id}_{secret}.jpg
                var p = reply.photos.photo[k];
                var title = p.title;
                var src = "http://farm" + p.farm + ".staticflickr.com/" + p.server + "/" + p.id + "_" + p.secret + ".jpg";
                if(k == 1) {
                    picsToHTML += imgTagBeg + src + imgTagEndOne;
                } else {
                    picsToHTML += imgTagBeg + src + imgTagEngOther;
                }
            }
            if(!picsToHTML) {
                picsToHTML = "<p>No photos were found matching your query.</p>";
            }
            //console.log(picsToHTML);
            res.end(picsToHTML);
        }
    });
});

// Word Cloud Word Generation
var g_wordcloudOnTimeout = false;
var g_wordcloudWords = null;
app.get("/getWordcloudWords", function (req, res) {
    if(!g_wordcloudOnTimeout){
        KeywordsModel.getHighestCountWords(function (words) {
            g_wordcloudWords = words;
            res.end(JSON.stringify(g_wordcloudWords));
        });
        g_wordcloudOnTimeout = true;
        setTimeout(function(){
            g_wordcloudOnTimeout = false;
        }, 60 * 1000);
    } else {
        console.log("INFO: Wordcloud Words Not Regenerated (on Timeout).");
        res.end(JSON.stringify(g_wordcloudWords));
    }
});

app.get("/getActiveKeywords", function (req, res) {
    KeywordsModel.getActiveKeywords(function(words){
        res.end(JSON.stringify(words));
    });
});

app.get("/activateKeywords", function (req, res){
    var keywords = null;
    var s = req.param('keywords');
    if(s) keywords = s.split(',');

    KeywordsModel.activateKeywords(keywords);
});

app.get("/deactivateKeywords", function(req, res){
    var keywords = null;
    var s = req.param('keywords');
    if(s) keywords = s.split(',');

    KeywordsModel.deactivateKeywords(keywords);
});

app.get("/test", function (req, res) {


});


//process.env.PORT is a cloud9 thing. Use your own port (ex 9999) if on a normal platform.
app.listen(3000);