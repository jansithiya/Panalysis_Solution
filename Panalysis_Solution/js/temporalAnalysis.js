/**
 * Created by Jansi Thiyagarajan on 11/05/17
 * Temporal analysis of the sales and transactions
 */

function temporal(orders, codes) {

    //nest data by Zip and year/Month to make it easier to identify max and min value
    var dateParse = d3.timeParse("%m-%Y");
    var dateFormat = d3.timeFormat("%m-%y");
    var nested_orders = d3.nest()
        .key(function (d) {
            return (d.MonthYear)
        })
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
        .entries(orders);

    var salesArray = nested_orders.map(function (d) {
        return d3.max(d.values, function (d) {
            return d.value.sales
        })
    });
    var transactionArray = nested_orders.map(function (d) {
        return d3.max(d.values, function (d) {
            return d.value.transactions
        })
    });

    //new array to store all relevant orders info to be used for data when drawing
    var temporalData = [];
    nested_orders.forEach(function (d) {

        var key = d.key;

        d.values.forEach(function (d) {
            temporalData.push({
                Date: key,
                Zip: d.key,
                sales: d.value.sales,
                transactions: d.value.transactions,
                shippingTotal: d.value.shippingTotal
            })
        })
    });

    //join additional postcode related info from post_codes table
    temporalData.forEach(function (order) {
        var result = codes.filter(function (code) {
            return code.postcode === order['Zip'];
        });
        order.postcode = (result[0] !== undefined) ? result[0].postcode : null;
        order.suburb = (result[0] !== undefined) ? result[0].suburb : null;
        order.state = (result[0] !== undefined) ? result[0].state : null;
        order.dc = (result[0] !== undefined) ? result[0].dc : null;
        order.type = (result[0] !== undefined) ? result[0].type : null;
        order.lat = (result[0] !== undefined) ? result[0].lat : null;
        order.lon = (result[0] !== undefined) ? result[0].lon : null;
    });
    temporalData.forEach(function (order) {
        var result = orders.filter(function (code) {
            return code['Billing Zip'] === order['Zip'];
        });
        order.province = (result[0] !== undefined) ? result[0]['Billing Province'] : null;
        order.city = (result[0] !== undefined) ? result[0]['Billing City'] : null;
    });

    console.log(temporalData)
    var null_state = temporalData.filter(function (d) {
        return d.state == null;
    });

    console.log(null_state);
    // Add state options to the state dropdown in the page
    var states = _.uniq(temporalData.map(function (d) {
        return d.province;
    }));

    for (var i = 0; i < states.length; i++) {
        $('#stateSelector').append($("<option/>", {
            value: states[i],
            text: states[i]
        }));
    }

    // create svg and attributes for temporal dot chart
    var width = 850,
        height = 600,
        padding = 100;

    var svg = d3.select("#temporal")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Time scale
    var x = d3.scaleTime()
        .range([padding, width - padding]);

    // y scale
    var y = d3.scaleLinear().range([height - padding, padding]);

    // circle radius as transactions
    var circleSize = d3.scaleLinear().range([3, 10]).domain(d3.extent(temporalData, function (d) {
        return d.transactions;
    }));

    //color scale for circles
    var colorScale = d3.scaleOrdinal(d3.schemeCategory10);
    // Domain for x and y axis

    var minDate = d3.min(orders, function (d) {
            return d.date;
        }),
        minDate_Scale = d3.timeMonth.offset(minDate, -1),
        maxDate = d3.max(orders, function (d) {
            return d.date;
        });

    console.log(minDate);

    console.log(maxDate);

    x.domain([minDate_Scale, maxDate]);
    y.domain([0, d3.max(temporalData, function (d) {
        return d.sales;
    })]);

    // Draw X Axis
    svg.append("g")
        .attr("class", "axis")
        .attr('id', "axis--x")

        .attr("transform", "translate(0," + (height - padding) + ")")
        .call(d3.axisBottom(x)
            .tickFormat(d3.timeFormat("%b-%y")).tickSizeInner(0))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-90)");

    // Draw Y Axis
    svg.append("g")
        .attr("class", "yaxis")
        .attr("transform", "translate(" + (padding) + ",0)")
        .call(d3.axisLeft(y));

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - 100)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1ZAem")
        .style("text-anchor", "middle")
        .text("Sales");


    //draw circles
    redrawCircle(temporalData);

    function redrawCircle(temporalData) {

        var measureSelected = document.getElementById("Measure");

        var circleData = svg.selectAll(".circles")
            .data(temporalData, function (d) {
                return d.id || (d.id = ++i);
            });

        var circleEnter = circleData.enter()
            .append("circle")
            .attr("class", "circles")
            .attr("r", function (d) {
                return circleSize(d.transactions);
            })
            .attr("cx", function (d) {
                return x(dateParse(d.Date))
            })
            .attr("cy", function (d) {
                return y(+d[measureSelected.value]);
            })
            .attr("fill", function (d) {
                return colorScale(d.province);
            });

        var circleUpdate = circleEnter.merge(circleData);

        var circleExit = circleData.exit().remove();
    }


    /*  ************** Multi-line chart for states **************** */

    //nest data by states
    var nestedStates =  d3.nest()
        .key(function (d) {
            return d['Billing Province'];
        })
        .key(function (d) {
            return (d.MonthYear)
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
        .entries(orders);

    //create svg to draw multi-line chart

    var margin = {top: 20, right: 80, bottom: 30, left: 50},
        width_ML = 800 - margin.left - margin.right,
        height_ML = 400 - margin.top - margin.bottom;

    var svgML = d3.select("#multiline")
        .append("svg")
        .attr("width", width_ML + margin.left + margin.right)
        .attr("height", height_ML + margin.top + margin.bottom);

     var g  = svgML.append("g")
             .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    //scale for x and y axis
    var x_ML = d3.scaleTime().range([0, width_ML]),
        y_ML = d3.scaleLinear().range([height_ML, 0]);

    //path generator
    var line = d3.line()
        .x(function(d) { return x_ML(dateParse(d.key)); })
        .y(function(d) { return y_ML(d.value.sales); });

    x_ML.domain(d3.extent(orders,function(d){return d.date;}));
    y_ML.domain([d3.min(nestedStates, function(c) { return d3.min(c.values, function(d) { return d.value.sales; }); }),
        d3.max(nestedStates, function(c) { return d3.max(c.values, function(d) { return d.value.sales; }); })]);

    g.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height_ML + ")")
        .call(d3.axisBottom(x_ML).tickFormat(d3.timeFormat("%b-%y")));

    g.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(y_ML))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", "0.71em")
        .attr("fill", "#000")
        .text("Temperature, ºF");

    var city = g.selectAll(".states")
        .data(nestedStates)
        .enter().append("g")
        .attr("class", "states");

    city.append("path")
        .attr("class", "line")
        .attr("d", function(d) { console.log(d.values); return line(d.values); })
        .style("stroke", function(d) { return colorScale(d.key); });







    //action on state filter
    var stateFilter = d3.select("#stateSelector").on("change", function () {

        var stateSelected = this.value;

        if (stateSelected == "ALL") {
            var filteredData = temporalData;
        }
        else {
            filteredData = temporalData.filter(function (d) {
                return d.province === stateSelected;
            });
        }

        var measureSelected = document.getElementById("Measure");

        //update Y axis domain

        y.domain([0, d3.max(filteredData, function (d) {
            return +d[measureSelected.value];
        })]);

        d3.select(".yaxis")
            .transition()
            .call(d3.axisLeft(y));

        redrawCircle(filteredData);

    });

    //update the measure in the temporal charts
    var measureFilter = d3.select("#Measure").on("change", function () {

        var measureSelected = document.getElementById("Measure");

        y.domain([0, d3.max(temporalData, function (d) {
            return +d[measureSelected.value];
        })]);

        d3.select(".yaxis")
            .call(d3.axisLeft(y));

        d3.selectAll("circle")
            .transition()
            .attr("cy", function (d) {
                return y(+d[measureSelected.value])
            })

    });
}
