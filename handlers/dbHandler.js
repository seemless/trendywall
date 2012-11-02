var dbHandler = function(dbName) {
    // Database Handler
    var MOD_mongoose = require('mongoose');

    //MOD_mongoose.set('debug', true);

    this.connection = MOD_mongoose.createConnection("localhost", dbName);
    this.connection.on('error', console.error.bind(console, 'connection error.'));

    // == Schemas ==
    this.wordSchema = new MOD_mongoose.Schema({
        // Mongoose only provides access via the _id field,
        // so that's where we store the word.
        _id: 'string',
        count: { type: 'number', default: 1 }
    });
    
    this.keywordSchema = new MOD_mongoose.Schema({
        keyword: 'string',
        isActive: 'boolean',
        wordbank: [this.wordSchema]
    });

    this.keywordSchema.statics.addText = function(inWord, textToStore, cb) {
        this.findOne({
            keyword: inWord
        }, function(err, obj) {
            if(err) console.error("ERROR: DB Error -> ", err);

            var glossary = require("glossary")({
                collapse: true,
                verbose: true,
                blacklist: [
                    "rt", "http", "www",
                    "of", "to", "the",
                    "a", "I", "lol",
                    ":)", ":(", "XD"
                ]
            });

            // Some filtering
            var filteredText = textToStore
                .replace(/&(\w+);/ig, ' ')  // Remove HTML entities (like &amp;, $nbsp;, etc...)
                .replace(/"/ig, ' ')
                .replace(/\s(\W+)\s/ig, ' ');

            // Calculate word frequency
            var wordsArray = glossary.extract(filteredText);
            // var wordsObj = {};
            // for(var i = 0; i < textArray.length; i++){
            //     if(textArray[i] === inWord) continue;
                
            //     // If the word exists in the dictionary, increment it's value, otherwise create it with value 1.
            //     wordsObj[textArray[i]] ? wordsObj[textArray[i]] += 1 : wordsObj[textArray[i]] = 1;
            // }

            // Store Words in DB
            // var wordsObjKeys = Object.keys(wordsObj);
            // for(var i = 0; i < wordsObjKeys.length; i++) {
            //     var doc = obj.wordbank.id(wordsObjKeys[i]);
            //     if(doc) { doc.count += wordsObj[wordsObjKeys[i]]; } 
            //     else { obj.wordbank.push({ _id: wordsObjKeys[i], count: wordsObj[wordsObjKeys[i]]}); }
            // }
            
            for(var i = 0; i < wordsArray.length; i++) {
                var doc = obj.wordbank.id(wordsArray[i].word);
                if(doc) { doc.count += wordsArray[i].count; } 
                else { obj.wordbank.push({ _id: wordsArray[i].word, count: wordsArray[i].count }); }
            }

            obj.save();

            // If we got passed a callback, call it.
            if(cb) { cb(); }
        });
    };

    this.keywordSchema.statics.activateKeywords = function(keywordsInArray, cb) {
        for(var i = 0; i < keywordsInArray.length; i++) {
            console.log("INFO: Activating Keyword '" + keywordsInArray[i] + "' in Database.");
            this.update(
                {keyword: keywordsInArray[i]},
                {isActive: true},
                {upsert: true},
                function(err) {if(err) console.log(err);}
            );
        }

        // If we got passed a callback, call it.
        if(cb) { cb(); }
    };

    this.keywordSchema.statics.deactivateKeywords = function(keywords, cb) {
        for(var i in keywords) {
            console.log("INFO: Deactivating Keyword '" + keywords[i] + "' in Database.");
            this.update(
                {keyword: keywords[i]},
                {isActive: false},
                {upsert: false},
                function(err) {if(err) console.log(err);}
            );
        }

        if(cb) { cb(); }
    };

    this.keywordSchema.statics.getHighestCountWords = function(cb, numWords) {
        numWords = typeof numWords !== 'undefined' ? a : 50; // Default 50 words if not passed in.
        var out = [];

        this.aggregate(
            {$match: {isActive: true}},
            {$unwind: "$wordbank"},
            {$project: {
                isActive: '$isActive',
                word: '$wordbank._id',
                count: '$wordbank.count'
            }},
            {$limit: numWords},
            {$sort: {count: -1}},
            function(err, res) {
                if(err) console.error(err);
                cb(res);
            }
        );
    };

    this.keywordSchema.statics.getActiveKeywords = function(cb) {
        var out = [];
        this.find(
            {isActive: true},
            function(err, res) { 
                for(var i = 0; i < res.length; i++) out.push(res[i].keyword); 
                cb(out);
            }
        );
    };
    this.keywordsModel = this.connection.model('Keyword', this.keywordSchema);

    return this;
}
module.exports = dbHandler;