/*
textlab-plot.js
Jeff Jacobs, 2017
With parts adapted from: http://stackoverflow.com/questions/34886070/multiseries-line-chart-with-mouseover-tooltip/34887578#34887578
http://halistechnology.com/2015/05/28/use-javascript-to-export-your-data-as-csv/

And then blatantly taken from:
https://github.com/exupero/saveSvgAsPng

REQUIREMENTS (Note that they need to be in this specific order, 
due to dependencies. Put all of these within the document <head>):
(1) jquery: <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js"></script>
(2) bootstrap js: <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js"></script>
(3) bootstrap css: <link href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css" rel="stylesheet"/>
(4) d3: <script data-require="d3@3.5.3" data-semver="3.5.3" src="//cdnjs.cloudflare.com/ajax/libs/d3/3.5.3/d3.js"></script>
(5) custom textlab-plot stylesheet: <link href="common/textlab-style.css" rel="stylesheet"/>
(6) Lastly, but most importantly, this js itself: <script src="common/textlab-plot.js"></script>

INSTRUCTIONS:

(1) Make sure there's a div in your .html file, with a unique id (say, "mydiv")
    
(2) Include another <script> tag in your .html, AFTER the tag created in (2),
    that calls plotData(csv_str, y_label, width, height), like:
    
    <script>
    plotData(my_csv, "mydiv", "Frequency", 800, 450);
    </script>
    
(3) For .csv downloading, make a normal <a> link, but set the href attribute
    to "#" and make the onclick attribute "downloadCSV(filename)", like:
    
    <a href='#' onclick='downloadCSV("{{csv_filename}}.csv");'>Download CSV</a>
*/

/*
An example csv file encoded as a javascript-readable string:
var myData = "decade,decadestr,word1,word2,word3\n\
1,1810s,63.4,62.7,72.2\n\
2,1820s,58.0,59.9,67.7\n\
3,1830s,53.3,59.1,69.4\n\
4,1840s,55.7,58.8,68.0\n\
5,1850s,64.2,58.7,72.4\n\
6,1860s,58.8,57.0,77.0\n\
7,1870s,57.9,56.7,82.3\n\
8,1880s,61.8,56.8,78.9\n\
9,1890s,69.3,56.7,68.8\n\
10,1900s,71.2,60.1,68.7\n\
11,1910s,68.7,61.1,70.3\n\
12,1920s,61.8,61.5,75.3\n\
13,1930s,63.0,64.3,76.6\n\
14,1940s,66.9,67.1,66.6\n\
15,1950s,61.7,64.6,68.0\n\
16,1960s,61.8,61.6,70.6\n\
17,1970s,62.8,61.1,71.1\n\
18,1980s,60.8,59.2,70.0\n\
19,1990s,62.1,58.9,61.6\n\
20,2000s,65.1,57.2,57.4\n";
*/
var plotData = function(query_data, div_id, y_label, interpolate, plot_width, plot_height){
  var myData = query_data;
  var data = d3.csvParse(myData);
  var num_rows = data.length;
  console.log(data[0])
  console.log(data[1])

    var margin = {
        top: 20,
        right: 150,
        bottom: 30,
        left: 60
      },
      width = plot_width - margin.left - margin.right,
      height = plot_height - margin.top - margin.bottom;
      

    var x = d3.scaleLinear()
      .domain([1,num_rows])
      .range([0, width]);

    var y = d3.scaleLinear()
      .range([height, 0]);

    var yAxis = d3.axisLeft(y);

    if (interpolate){
    // The tension parameter is a smoothing parameter
    var line = d3.line()
      .curveCardinal(tension=0.7)
      .x(function(d) {
        return x(d.id);
      })
      .y(function(d) {
        return y(d.frequency);
      });
    } else {
      var line = d3.line()
      .x(function(d){
        return x(d.id);
      })
      .y(function(d){
        return y(d.frequency);
      });
    }

    var div_name = "#" + div_id;
    var svg = d3.select(div_name).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .attr("id",div_id + "-svg")
      .style("background-color","white")
      .style("font-family","sans-serif")
      .style("font-size","12px")
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
    var decade_map = {};
    data.forEach(function(d){
      decade_map[d.id] = d.Year;
    });
    
    var formatDecade = function(d){
      return decade_map[d];
    };

    var xAxis = d3.axisBottom(x)
      .tickFormat(formatDecade);

    //var color = d3.schemeCategory10;
    var color = d3.scaleOrdinal(d3.schemeCategory10).domain(d3.keys(data[0]).filter(function(key) {
      return (key !== "decade" && key !== "decadestr" && key !== "Year" && key !== "id");
    }));

    var cities = color.domain().map(function(name) {
      return {
        name: name,
        values: data.map(function(d) {
          return {
            id: d.id,
            frequency: +d[name]
          };
        })
      };
    });

    y.domain([
      d3.min(cities, function(c) {
        return d3.min(c.values, function(v) {
          return v.frequency;
        });
      }),
      d3.max(cities, function(c) {
        return d3.max(c.values, function(v) {
          return v.frequency;
        });
      })
    ]);

    var legend = svg.selectAll('g')
      .data(cities)
      .enter()
      .append('g')
      .attr('class', 'legend')
      .attr('background-color','white');

    legend.append('rect')
      .attr('x', width)
      .attr('y', function(d, i) {
        return i * 20 + 20;
      })
      .attr('width', 10)
      .attr('height', 10)
      .style('fill', function(d) {
        return color(d.name);
      });

    legend.append('text')
      .attr('x', width + 12)
      .attr('y', function(d, i) {
        return (i * 20) + 29;
      })
      .text(function(d) {
        return d.name;
      });

    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

    svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text(y_label);
      
    svg.selectAll(".domain")
      .style("fill","none")
      .style("stroke","#000")
      .style("shape-rendering","crispEdges");
      
    svg.selectAll(".tick line")
      .style("fill","none")
      .style("stroke","#000")
      .style("shape-rendering","crispEdges")
      .style("stroke-width","1px");
      


    var city = svg.selectAll(".city")
      .data(cities)
      .enter().append("g")
      .attr("class", "city");

    city.append("path")
      .attr("class", "line")
      .style("fill","none")
      .style("stroke-width","1.5px")
      .attr("d", function(d) {
        return line(d.values);
      })
      .style("stroke", function(d) {
        return color(d.name);
      });

    city.append("text")
      .datum(function(d) {
        return {
          name: d.name,
          value: d.values[d.values.length - 1]
        };
      })
      .attr("transform", function(d) {
        return "translate(" + x(d.value.id) + "," + y(d.value.frequency) + ")";
      })
      .attr("x", 3)
      .attr("dy", ".35em")
      .attr("fill",function(d){
        return color(d.name);
      })
      .attr("font-weight","bold")
      .text(function(d) {
        return d.name;
      });

    var mouseG = svg.append("g")
      .attr("class", "mouse-over-effects");

    mouseG.append("path") // this is the black vertical line to follow mouse
      .attr("class", "mouse-line")
      .style("stroke", "black")
      .style("stroke-width", "1px")
      .style("opacity", "0");
      
    var lines = $('#' + div_id + ' .line');

    var mousePerLine = mouseG.selectAll('.mouse-per-line')
      .data(cities)
      .enter()
      .append("g")
      .attr("class", "mouse-per-line");

    mousePerLine.append("circle")
      .attr("r", 7)
      .style("stroke", function(d) {
        return color(d.name);
      })
      .style("fill", "none")
      .style("stroke-width", "1px")
      .style("opacity", "0");
      
    mousePerLine.append('svg:rect')
      .style("opacity","0")
      .attr('width', 53)
      .attr('height', 15)
      .attr('fill', 'white')
      .attr('stroke-width', 1)
      .attr('stroke', function(d) {
        return color(d.name);
      })
      .attr('transform', 'translate(10,-9)');

    mousePerLine.append("text")
      .attr("transform", "translate(10,3)");

    mouseG.append('svg:rect') // append a rect to catch mouse movements on canvas
      .attr('width', width) // can't catch mouse events on a g element
      .attr('height', height)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('mouseout', function() { // on mouse out hide line, circles and text
        svg.select(".mouse-line")
          .style("opacity", "0");
        svg.selectAll(".mouse-per-line circle")
          .style("opacity", "0");
        svg.selectAll(".mouse-per-line text")
          .style("opacity", "0");
        svg.selectAll(".mouse-per-line rect")
          .style("opacity", "0");
      })
      .on('mouseover', function() { // on mouse in show line, circles and text
        svg.select(".mouse-line")
          .style("opacity", "1");
        svg.selectAll(".mouse-per-line circle")
          .style("opacity", "1");
        svg.selectAll(".mouse-per-line text")
          .style("opacity", "1");
        svg.selectAll(".mouse-per-line rect")
          .style("opacity", "1");
      })
      .on('mousemove', function() { // mouse moving over canvas
        var mouse = d3.mouse(this);
        svg.select(".mouse-line")
          .attr("d", function() {
            var d = "M" + mouse[0] + "," + height;
            d += " " + mouse[0] + "," + 0;
            return d;
          });
        svg.select("#xval").text(x.invert(mouse[0]).toFixed(2))

        
        var transformText = function(d, i) {
            // The excruciatingly easy way - using d3.bisector().
            // This works for linear (non-interpolated) data:
            if (interpolate == false) {
              var xDate = x.invert(mouse[0])
              var bisect = d3.bisector(function(d) { return d.id; }).right;
              var idx = bisect(d.values, xDate);
              //console.log("idx: " + idx);
              //console.log("d.values length: " + d.values.length);
              if (idx >= d.values.length || idx <= 0) {
                return;
              }
              var cur_actual_y = d.values[idx].frequency;
              //console.log("cur_actual_y: " + cur_actual_y);
              d3.select(this).select('text')
                .text(cur_actual_y);
                
              var to_select = "#y" + i
              d3.select(to_select).text(cur_actual_y);
              return "translate(" + mouse[0] + "," + y(cur_actual_y) +")";
            } else {
            
              // The excruciatingly hard way - bisecting "manually".
              // Has to be done for interpolated graphs:
              var beginning = 0,
                  end = lines[i].getTotalLength(),
                  target = null;
                  
              //console.log("end: " + end);
              var first_target = Math.floor((beginning+end)/2);
              //console.log("first target: " + first_target);
              var first_pos = lines[i].getPointAtLength(first_target);
              //console.log("first pos: " + first_pos.x + ", " + first_pos.y);

              var num_iterations = 0;
              while (true){
                num_iterations = num_iterations + 1;
                target = Math.floor((beginning + end) / 2);
                pos = lines[i].getPointAtLength(target);
                if ((target === end || target === beginning) && pos.x !== mouse[0]) {
                    //console.log("If statement reached after " + num_iterations + " iterations\nTarget: " + target + "\nBeginning: " + beginning + "\nEnd: " + end);
                    break;
                }
                if (pos.x > mouse[0])      end = target;
                else if (pos.x < mouse[0]) beginning = target;
                else break; //position found
              }
              
              var ypos = y.invert(pos.y).toFixed(2);
              
              var yinfo = "" + i + " " + ypos;
              //console.log(ypos);
              
              d3.select(this).select('text')
                .text(ypos);
                
              var to_select = "#y" + i
              d3.select(to_select).text(ypos);
              return "translate(" + mouse[0] + "," + pos.y +")";
            }
          };
          svg.selectAll(".mouse-per-line")
          .attr("transform", transformText)
      });
}
  
  var downloadCSV = function(theData, filename) {
        var data, filename, link;

        var csv = theData;
        if (csv == null) return;

        filename = filename || 'export.csv';

        if (!csv.match(/^data:text\/csv/i)) {
            csv = 'data:text/csv;charset=utf-8,' + csv;
        }
        data = encodeURI(csv);

        link = document.createElement('a');
        link.setAttribute('href', data);
        link.setAttribute('download', filename);
        link.click();
        
        return false;
    }
