/**
 * Created by jansi on 11/05/17.
 */

//load the data
d3.queue()
    .defer(d3.csv,"../data/orders_export.csv")
    .defer(d3.csv,"../data/Australian_Post_Codes_Lat_Lon.csv")
    .defer(d3.json, "../data/postcodes.json")
    .await(merge);


function merge(error,orders,codes,geoJson){

    var timeFormat = d3.utcParse("%Y-%m-%d %H:%M:%S %Z");
    var myFormat = d3.timeFormat("%m-%Y");
    var yearFormat = d3.timeFormat("%Y");
    var monthFormat = d3.timeFormat("%B");
    orders.forEach(function(d){
        d['Billing Zip']=  d['Billing Zip'].slice(1);
        if(d['Billing Zip'].charAt(0) === '0')
            d['Billing Zip']=  d['Billing Zip'].slice(1);

        d['date'] = timeFormat(d['Created at'   ]);
        d.MonthYear = myFormat(d.date);
        d.Month = monthFormat(d.date);
        d.Year = yearFormat(d.date);
        d.Subtotal = +d .Subtotal;
        d.Shipping = +d.Shipping;
        d.Taxes = +d.Taxes;
        d.Total = +d.Total;

    });

    //join the main orders table with post code table to get suburb name and geo position info
    orders.sort(function(a, b) { return a.date - b.date })

    console.log(orders);
    render(orders,codes,geoJson);
}

