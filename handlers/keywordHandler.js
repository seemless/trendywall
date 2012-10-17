// Keyword Handler
function KeywordBank(){
  // Public Member Variables
  this.keywords = [];

  // Private Keyword Class
  function Keyword(inWord){
    this.word = inWord;
    this.isActive = true;
  }

  // Public Methods
  this.addKeyword = function(inWord){
    var kw = null;

    // Search through keywords to see if the new
    // word already exists. If so, activate it.
    for(var i in this.keywords){
      if(this.keywords[i].word === inWord){
        kw = this.keywords[i];
        kw.isActive = true;
        break;
      }
    }

    // If keyword doesn't exist, create it.
    if(kw === null){
      kw = new Keyword(inWord);
      kw.isActive = true;
      this.keywords.push(kw);
    }
  };

  // Search through keywords to see if the word
  // exists. If so, de-activate it.
  this.removeKeyword = function(inWord){
    for(var )
  }

  this.getKeywordsAsArray = function(getInactiveKeywords){
    var out = [];
    for(var i in this.keywords){
      if(this.keywords[i].isActive || getInactiveKeywords){
        out.push(this.keywords[i].word);
      }
    }
    return out;
  };

  this.getKeywordsAsString = function(getInactiveKeywords){
    var out = "";
    for(var i in this.keywords){
      if(this.keywords[i].isActive || getInactiveKeywords){
        out += this.keywords[i].word + ', ';
      }
    }

    // Remove trailing ", "
    out = out.slice(0,out.length-2);
    return out;
  };

}
