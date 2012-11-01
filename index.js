var DEBUG = false;

//require("nodetime").profile();

var express = require("express");
var app = express();

var request = require("request"); //for doing http gets.. in this case to get google top 10

var NUM_WORDS_IN_CLOUD = 50;

var glossary = require("glossary")({
    collapse: true,
    blacklist: ["rt", "http", "www", "of", "to", "the", "a", "I", "lol"]
});


// Database Setup
var mongoose = require('mongoose');
var today = new Date();
var dbConnection = mongoose.createConnection("localhost", "db"+today.getFullYear()+today.getMonth()+today.getDate());
if(DEBUG) mongoose.set('debug', true);
dbConnection.on('error', console.error.bind(console, 'connection error.'));

// Schemas
var WordSchema = new mongoose.Schema({
    // Mongoose only provides access via the _id field,
    // so that's where we store the word.
    _id: 'string',
    count: { type: 'number', default: 1 }
});

WordSchema.index({count: -1, _id: 1});

var KeywordSchema = new mongoose.Schema({
    keyword: 'string',
    isActive: 'boolean',
    wordbank: [WordSchema]
});

//WordSchema.index({_id: 1, count: 1});

// DB Model Methods
// Pass in array of words/phrases to store.
KeywordSchema.statics.addText = function (keyword, textToStore, cb) {
    this.findOne({keyword: keyword}, function(err, obj){
        if(err) console.error("ERROR: DB Error -> ", err);
        
        // Store Words in DB
        var theWords = glossary.extract(textToStore);
        console.log(theWords);
        for(var i = 0; i < theWords.length; i++) {
            if(theWords[i] !== ''){
                var doc = obj.wordbank.id(theWords[i]);
                if(doc) {
                    doc.count++;
                } else {
                    obj.wordbank.push({
                        _id: theWords[i]
                    });
                }
            }
        }

        obj.save();
        console.log("SAVED");

        // If we got passed a callback, call it.
        if(cb) {
            cb();
        }
    });
};


KeywordSchema.statics.activateKeywords = function (keywords, cb) {
    for(var i in keywords) {
        console.log("INFO: Activating Keyword '" + keywords[i] + "'");
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
        console.log("INFO: Deactivating Keyword '" + keywords[i] + "'");
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
        { $project: {isActive: '$isActive', word: '$wordbank._id', count: '$wordbank.count'} },
        { $limit: numWords },
        { $sort: {count: -1} },
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

var KeywordsModel = dbConnection.model('Keyword', KeywordSchema);

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
    twitter.startStreamFromTwitter();
    twitter.startStreamToClient(req, res);
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

var flickr = require("./handlers/flickrHandler.js")();

// FLICKR STREAM
// Requires Parameters:
//    tagMode - 'any' or 'all'
//    keywords - comma-delimited list
app.get("/flickr", function (req, res) {
    var tagMode = req.param('tagMode');
    var queryWords = unescape(req.param('keywords')).split(',');
    flickr.request(queryWords, tagMode, function(result){
        res.end(result);
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
    else res.end();

    KeywordsModel.activateKeywords(keywords, twitter.startStreamFromTwitter);
    res.end();
});

app.get("/deactivateKeywords", function(req, res){
    var keywords = null;
    var s = req.param('keywords');
    if(s) keywords = s.split(',');
    else res.end();

    KeywordsModel.deactivateKeywords(keywords, twitter.startStreamFromTwitter);
    res.end();
});

app.get("/test", function (req, res) {


});

//process.env.PORT is a cloud9 thing. Use your own port (ex 9999) if on a normal platform.
app.listen(3000);