function doCloud(){
  var w = $("div#wordcloud").width();
  var h = $("div#wordcloud").height();

  if(w === null | h === null){
    return;
  }

  $.getJSON("/getWordcloudWords", function(data, text, obj){
      var fontSize = d3.scale.log().range([10, 100]);
      var layout = d3.layout.cloud()
      .size([w, h])
      .timeInterval(10)
      .text(function(d) { return d.word; })
      .font("Arial Narrow")
      .fontSize(function(d){return fontSize(+d.count); })
      //.rotate(function(d) { return ~~(Math.random() * 5) * 30 - 60; })
      .padding(5)
      .on("end", draw)
      .words(data)
      .start();

      function draw(words) {
        d3.select("#wordcloud").append("svg")
        .attr("width", w)
        .attr("height", h)
        .style("background", "black")
        .append("g")
        .attr("transform", "translate(" + w/2 + "," + (h/2 + 5) + ")")
        .selectAll("text")
        .data(words)
        .enter().append("text")
        .style("font-size", function(d) { return ( d.size) + "px"; })
        .style("font-family", function(d) { return (d.font); })
        .attr("text-anchor", "middle")
        .style("fill", "white")
        .attr("transform", function(d) {
          return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
        })
        .text(function(d) { return d.text; });
      }
    }
  );
}
