/**
 * Author: Jansi Thiyagarajan
 *
 */
var centered;
function render(orders, codes, geoJson) {

    //get the topo json data

    var geoData = topojson.feature(geoJson, geoJson.objects.postcodesgeo).features;

    geoData.forEach(function (d) {

        var code;

        if (d.id.startsWith("POA0")) {
            code = d.id.slice(4);
        }
        else {
            code = d.id.slice(3);
        }
        d.zip = code;

    });

    /* ******* prepare data to use in maps ********* */

    var orderState, ordersZip;

    //Merge orders and post code table to fetch additional info
    orders.forEach(function (order) {
        var result = codes.filter(function (code) {
            return code.postcode === order['Billing Zip'];
        });
        order.postcode = (result[0] !== undefined) ? result[0].postcode : null;
        order.suburb = (result[0] !== undefined) ? result[0].suburb : null;
        order.state = (result[0] !== undefined) ? result[0].state : null;
        order.dc = (result[0] !== undefined) ? result[0].dc : null;
        order.type = (result[0] !== undefined) ? result[0].type : null;
        order.lat = (result[0] !== undefined) ? +result[0].lat : null;
        order.lon = (result[0] !== undefined) ? +result[0].lon : null;
    });

    var year = _.uniq(orders.map(function (d) {
        return d.Year;
    }));
    var month = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];

    var numberFormat = d3.format('.0f');

    // Set options for year and month dropdown

    for (var i = 0; i < year.length; i++) {
        $("#yearSelector").append($("<option/>", {
            value: year[i],
            text: year[i]
        }));
    }
    for (i = 0; i < month.length; i++) {
        $("#monthSelector").append($("<option/>", {
            value: month[i],
            text: month[i]
        }));
    }
    var measureZip, measureById, measureState, measureCity;
    var measureSelected = document.getElementById("Measure").value;

    var tooltip = d3.select("body")
        .append("div")
        .attr("id", "tooltip")
        .style("position", "absolute")
        .style("z-index", "10")
        .style("visibility", "hidden");

    data();

    function data() {

        var yearSelected = document.getElementById("yearSelector").value,
            monthSelected = document.getElementById("monthSelector").value;

        console.log(yearSelected);

        var zipFiltered = orders.filter(function (d) {

            if (yearSelected == "ALL" && monthSelected != "ALL") {
                return d.Month == monthSelected;
            }
            else if (yearSelected != "ALL" && monthSelected == "ALL") {
                return d.Year == yearSelected;

            }
            else if (yearSelected != "ALL" && monthSelected != "ALL") {
                return (d.Year == yearSelected && d.Month == monthSelected)
            }
            else {
                return d;
            }
        });

        var ordersZip = d3.nest()
            .key(function (d) {
                return d['Billing Zip'];
            })
            .rollup(function (order) {
                return {
                    "transactions": order.length,
                    "sales": d3.sum(order, function (d) {
                        return d.Subtotal;
                    }),
                    "shippingTotal": d3.sum(order, function (d) {
                        return d.Shipping;
                    }),
                    "shippingMedian": d3.median(order, function (d) {
                        return d.Shipping;
                    })
                }
            })
            .entries(zipFiltered);

        var ordersState = d3.nest()
            .key(function (d) {
                return d['Billing Province'];
            })
            .rollup(function (order) {
                return {
                    "transactions": order.length,
                    "sales": d3.sum(order, function (d) {
                        return d.Subtotal;
                    }),
                    "shippingTotal": d3.sum(order, function (d) {
                        return d.Shipping;
                    }),
                    "shippingMedian": d3.median(order, function (d) {
                        return d.Shipping;
                    })
                }
            })
            .entries(zipFiltered);

        var measureChosen = document.getElementById("Measure").value;

        measureCity = d3.nest()
            .key(function (d) {
                return d['Billing Province'];
            })
            .key(function (d) {
                return d['Billing City'];
            })
            .rollup(function (order) {
                if (measureChosen == "sales") {
                    return d3.sum(order, function (d) {
                        return d.Subtotal;
                    });
                } else if (measureChosen == "shippingTotal") {
                    return d3.sum(order, function (d) {
                        return d.Shipping;
                    });
                } else {
                    return order.length;
                }
            })
            .entries(zipFiltered);

        console.log(measureCity);

        measureZip = [];
        measureState = [];

        ordersZip.forEach(function (d) {
            measureZip.push({
                id: d.key,
                sales: d.value.sales,
                transactions: d.value.transactions,
                shippingTotal: d.value.shippingTotal,
                shippingMedian: d.value.shippingMedian
            })
        });
        //join additional postcode related info from post_codes table
        measureZip.forEach(function (order) {
            var result = codes.filter(function (code) {
                return code.postcode === order['id'];
            });
            order.postcode = (result[0] !== undefined) ? result[0].postcode : null;
            order.suburb = (result[0] !== undefined) ? result[0].suburb : null;
            order.state = (result[0] !== undefined) ? result[0].state : null;
            order.dc = (result[0] !== undefined) ? result[0].dc : null;
            order.type = (result[0] !== undefined) ? result[0].type : null;
            order.lat = (result[0] !== undefined) ? +result[0].lat : null;
            order.lon = (result[0] !== undefined) ? +result[0].lon : null;
        });

        measureZip.forEach(function (order) {
            var result = orders.filter(function (code) {
                return code['Billing Zip'] === order['id'];
            });
            order.province = (result[0] !== undefined) ? result[0]['Billing Province'] : null;
            order.city = (result[0] !== undefined) ? result[0]['Billing City'] : null;
        });

        ordersState.forEach(function (d) {
            measureState.push({
                state: d.key,
                sales: d.value.sales,
                transactions: d.value.transactions,
                shippingTotal: d.value.shippingTotal,
                shippingMedian: d.value.shippingMedian
            })
        });

        measureState.sort(function (a, b) {
            return (+a[measureSelected]) - (+b[measureSelected]);
        })

    }

    measureById = {};
    var measureByCity = {}, measureByState = {};
    measureZip.forEach(function (d) {
        measureById[d.id] = +d[measureSelected];
        measureByCity[d.id] = d.city;
        measureByState[d.id] = d.province;
    });

    var measureRange = d3.extent(measureZip, function (d) {
        return +d[measureSelected];
    });

    console.log(measureById)

    //svg attributes
    var width = 700, height = 500;
    var svg = d3.select("#map")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    var x = d3.scaleLinear()
        .domain(measureRange)
        .rangeRound([600, 860]);

    var color = d3.scaleThreshold()
        .domain(d3.range(measureRange))
        .range(d3.schemeBlues[9]);


    var g = svg.append("g")
        .attr("class", "key")
        .attr("transform", "translate(0,40)");

    var legend = d3.select("#mapLegend")
        .append("svg")
        .attr("width", 200)
        .attr("height", 200)
        .attr("transform", "translate(0,40)");

    legend.selectAll("rect")
        .data(color.range().map(function (d) {
            d = color.invertExtent(d);
            if (d[0] == null) d[0] = x.domain()[0];
            if (d[1] == null) d[1] = x.domain()[1];
            return d;
        }))
        .enter().append("rect");


    var projection = d3.geoMercator()
        .center([0, -27])
        .rotate([-140, 0])
        .scale(Math.min(height * 1.2, width * 0.8))
        .translate([width / 2.5, height / 2.5])
        .precision(0.1);

    var path = d3.geoPath()
        .projection(projection);

    g.append("g")
        .attr("class", "counties")
        .selectAll("path")
        .data(geoData)
        .enter().append("path")
        .attr("d", path)
        .style("fill", function (d) { if(measureById[d.zip]) {
            return color(measureById[d.zip]);
        }else{
            return "#bdbdbd";
        }
        })
        .on("click", clicked)
        .on("mouseover", function (d) {
            if (measureById[d.zip]) {
                return tooltip.style("visibility", "visible").html("<b>" + "Zip:  " + "</b>" + d.zip + "<br/>" + "<b>" + measureSelected + ":  "
                    + "</b>" + measureById[d.zip] + "<br/>" + "<b>" + "City:  " + "</b>" + measureByCity[d.zip]);
            }
        })
        .on("mousemove", function (d) {
            return tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function (d) {
            return tooltip.style("visibility", "hidden");
        });


    // code to render the state level  bar chart view

    var marginBar = {top: 30, left: 60, bottom: 20, right: 20},
        widthBar = 600 - marginBar.left - marginBar.right,
        heightBar = 200 - marginBar.top - marginBar.bottom;

    var svgBar = d3.select("#stateBar")
        .append("svg")
        .attr("width", widthBar + marginBar.left + marginBar.right)
        .attr("height", heightBar + marginBar.top + marginBar.bottom)
        .append("g")
        .attr("transform", "translate(" + marginBar.left + ", " + marginBar.top + ")");


    var xScale = d3.scaleLinear()
        .range([40, widthBar - 30]);


    var yScale = d3.scaleBand().rangeRound([heightBar, 0]).padding(0.2);


    var stateColor = d3.scaleOrdinal(d3.schemeCategory10);

    updateBar(measureState);

    function updateBar(states) {

        xScale.domain(d3.extent(measureState, function (d) {
            return +d[measureSelected];
        }));

        yScale.domain(measureState.map(function (d) {
            return d.state;
        }));

        var bars = svgBar.selectAll("g")
            .data(states, function (d) {
                return d.id || (d.id = ++i);
            });

        svgBar.append("text")
            .attr("class", "title")
            .attr("y", -10)
            .text("Performance Metrics Overview by State");

        var barsEnter = bars.enter()
            .append("g");

        var rectEnter = barsEnter.append("rect")
            .attr("class", "bar")
            .attr("x", 0)
            .attr("y", function (d) {
                return yScale(d.state);
            })
            .attr("height", yScale.bandwidth())
            .attr("width", function (d) {
                return xScale(+d[measureSelected]);
            })
            .style("fill", function (d) {
                return stateColor(d.state);
            })
            .on("click", barClick);

        var stateLabel = barsEnter.append("text")
            .attr("class", "stateLabel")
            .attr("x", -40)
            .attr("y", function (d) {
                return yScale(d.state) + yScale.bandwidth();
            })
            .text(function (d) {
                return d.state;
            });

        var measureLabel = barsEnter.append("text")
            .attr("class", "measureLabel")
            .attr("x", function (d) {
                return xScale(+d[measureSelected]) + 10;
            })
            .attr("y", function (d) {
                return yScale(d.state) + yScale.bandwidth();
            })
            .text(function (d) {
                if (measureSelected == "sales") {
                    return "$" + numberFormat(d[measureSelected]);
                }
                else {
                    return numberFormat(d[measureSelected]);
                }
            });
        var barsUpdate = barsEnter.merge(bars);

        var barsExit = bars.exit().remove();
    }

    /* ****************  Bubble chart to encode all three measures    *************** */

    var bubbleMargin = {top: 40, right: 20, bottom: 30, left: 40},
        bubbleWidth = 600 - bubbleMargin.left - bubbleMargin.right,
        bubbleHeight = 310 - bubbleMargin.top - bubbleMargin.bottom;


    var bubbleSvg = d3.select("#bubble")
        .append("svg")
        .attr("width", bubbleWidth + bubbleMargin.left + bubbleMargin.right)
        .attr("height", bubbleHeight + bubbleMargin.top + bubbleMargin.bottom)
        .append("g")
        .attr("transform", "translate(" + bubbleMargin.left + "," + bubbleMargin.top + ")");

    var bubbleX = d3.scaleLinear()
        .range([0, bubbleWidth]);

    var bubbleY = d3.scaleLinear()
        .range([bubbleHeight, 0]);


    // circle radius as transactions
    var bubbleSize = d3.scaleLinear().range([3, 10]).domain(d3.extent(measureZip, function (d) {
        return d.transactions;
    }));

    bubbleX.domain(d3.extent(measureZip, function (d) {
        return d.shippingTotal;
    }));

    bubbleY.domain(d3.extent(measureZip, function (d) {
        return d.sales;
    }));
    bubbleSvg.append("text")
        .attr("class", "title")
        .attr("x", 30)
        .attr("y", -20)
        .text("Bubble Chart - Encoding all Metrics (Size represents total transactions)");

    bubbleSvg.append("g")
        .attr("class", "xAxis")
        .attr("transform", "translate(0," + bubbleHeight + ")")
        .call(d3.axisBottom(bubbleX));


    bubbleSvg.append("text")
        .attr("class", "label")
        .attr("transform", "translate(0," + bubbleHeight + ")")
        .attr("x", bubbleWidth)
        .attr("y", -6)
        .style("text-anchor", "end")
        .text("Total Shipping Cost");

    bubbleSvg.append("g")
        .attr("class", "yAxis")
        .call(d3.axisLeft(bubbleY));

    bubbleSvg.append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Sales in AU $");

    //draw bubble
    redrawBubble(measureZip);

    function redrawBubble(bubbleData) {

        console.log(bubbleData);

        bubbleX.domain(d3.extent(bubbleData, function (d) {
            return d.shippingTotal;
        }));
        bubbleY.domain(d3.extent(bubbleData, function (d) {
            return d.sales;
        }));

        bubbleSize.domain(d3.extent(bubbleData, function (d) {
            return d.transactions;
        }));

        var circleData = bubbleSvg.selectAll(".circles")
            .data(bubbleData, function (d) {
                return d.ids || (d.ids = ++i);
            });

        var circleEnter = circleData.enter()
            .append("circle")
            .attr("class", "circles")
            .attr("r", function (d) {
                return bubbleSize(d.transactions);
            })
            .attr("cx", function (d) {
                return bubbleX(d.shippingTotal)
            })
            .attr("cy", function (d) {
                return bubbleY(d.sales);
            })
            .attr("fill", function (d) {
                return stateColor(d.state);
            })
            .on("mouseover", function (d) {
                return tooltip.style("visibility", "visible").html("<b>" + "Zip:  " + "</b>" + d.id + "<br/>" + "<b>" + "Sales:  $"
                    + "</b>" + numberFormat(d.sales) + "<br/>" + "<b>" + "Transactions:  "
                    + "</b>" + d.transactions + "<br/>" + "<b>" + "City:  " + "</b>" + d.city);
            })
            .on("mousemove", function (d) {
                return tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", function (d) {
                return tooltip.style("visibility", "hidden");
            });


        var circleUpdate = circleEnter.merge(circleData);

        var circleExit = circleData.exit().remove();

    }

    /*  ************* Render treemap to show the measures by city ************** */

    var treeMargin = {top: 30, right: 20, bottom: 10, left: 50},
        treeWidth = 700 - bubbleMargin.left - bubbleMargin.right,
        treeHeight = 400 - bubbleMargin.top - bubbleMargin.bottom;


    var treeSvg = d3.select("#title")
        .append("svg")
        .attr("width", treeWidth + treeMargin.left + treeMargin.right)
        .attr("height", treeHeight + treeMargin.top + treeMargin.bottom)
        .append("g")
        .attr("transform", "translate(" + treeMargin.left + "," + treeMargin.top + ")");

    treeSvg.append("text")
        .attr("class", "title")
        .text("Performance Overview by City and State")

    var treeX = d3.scaleLinear()
        .range([0, treeWidth]);

    var treeY = d3.scaleLinear()
        .range([treeHeight, 0]);

    var treemap = d3.treemap()
        .size([treeWidth, treeHeight])
        .padding(1.5)
        .round(true);

    var root;

    redrawTree(measureCity);
    function redrawTree(treeData) {

        root = d3.hierarchy({values: treeData}, function (d) {
            return d.values;
        })
            .sum(function (d) {
                return d.value;
            })
            .sort(function (a, b) {
                return b.value - a.value
            });

        var colorScale = d3.scaleSequential(d3["interpolateGnBu"])
            .domain(d3.extent(root.leaves(), function (d) {
                return d.value;
            }));

        treemap(root);

        var node = d3.select("#treeMap")
            .selectAll(".node")
            .data(root.leaves(), function (d) {
                return d.id || (d.id = ++i);
            });

        var nodeEnter = node.enter().append("div")
            .attr("class", "node")
            .style("left", function (d) {
                return d.x0 + "px";
            })
            .style("top", function (d) {
                return d.y0 + "px";
            })
            .style("width", function (d) {
                return d.x1 - d.x0 + "px";
            })
            .style("height", function (d) {
                return d.y1 - d.y0 + "px";
            })
            .style("background", function (d) {
                return colorScale(d.value);
            })
            .on("mouseover", function (d) {
                return tooltip.style("visibility", "visible").html("<b>" + "City:  " + "</b>" + d.data.key + "<br/>" + "<b>" + measureSelected + ": "
                    + "</b>" + numberFormat(d.value) + "<br/>" + "<b>" + "State: " + d.parent.data.key);
            })
            .on("mousemove", function (d) {
                return tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", function (d) {
                return tooltip.style("visibility", "hidden");
            });

        nodeEnter.append("div")
            .attr("class", "node-label")
            .text(function (d) {
                return d.data.key;
            });

        nodeEnter.append("div")
            .attr("class", "node-value")
            .text(function (d) {
                return numberFormat(d.value);
            });

        var nodeUpdate = nodeEnter.merge(node);

        var nodeExit = node.exit().remove();
    }


    /* ******************* Click to zoom the state   ***************** */

    function clicked(d) {
        var x, y, k;

        if (d && centered !== d) {
            var centroid = path.centroid(d);
            x = centroid[0];
            y = centroid[1];
            k = 4;
            centered = d;
        } else {
            x = width / 2;
            y = height / 2;
            k = 1;
            centered = null;
        }

        g.selectAll("path")
            .classed("active", centered && function (d) {
                    return d === centered;
                });

        g.transition()
            .duration(750)
            .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
            .style("stroke-width", 1.5 / k + "px");


    }


    d3.select("#yearSelector").on("change", function () {

        parameterChange();
    });

    d3.select("#monthSelector").on("change", function () {

        parameterChange();
    });

    d3.select("#Measure").on("change", function () {

        parameterChange();
    });

    function parameterChange() {

        data();

        //update axis for bubble chart

        bubbleX.domain(d3.extent(measureZip, function (d) {
            return d.shippingTotal;
        }));
        bubbleY.domain(d3.extent(measureZip, function (d) {
            return d.sales;
        }));

        d3.select(".xAxis")
            .call(d3.axisBottom(bubbleX));

        d3.select(".yAxis")
            .call(d3.axisLeft(bubbleY));

        //update bubble chart
        redrawBubble(measureZip);

        //update tree map
        redrawTree(measureCity);

        measureById = {};
        measureSelected = document.getElementById("Measure").value;

        measureZip.forEach(function (d) {
            measureById[d.id] = +d[measureSelected];
        });

        measureRange = d3.extent(measureZip, function (d) {
            return +d[measureSelected];
        });

        d3.selectAll(".counties path")
            .transition()
            .attr("fill", function (d) {
                if (d.id.startsWith("POA0")) {
                    var code = d.id.slice(4);
                    return color(measureById[code]);
                }
                else {
                    code = d.id.slice(3);
                    return color(measureById[code]);
                }
            });

        xScale.domain(d3.extent(measureState, function (d) {
            return +d[measureSelected];
        }));

        updateBar(measureState);
    }

    function barClick(d) {

        var bubbleData = measureZip.filter(function (e) {
            return d.state === e.province;
        });

        var treeData = measureCity.filter(function (e) {
            return d.state === e.key;
        });

        redrawBubble(bubbleData);
        redrawTree(treeData);
    }


}
