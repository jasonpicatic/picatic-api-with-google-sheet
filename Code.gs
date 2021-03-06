function onOpen() {
    SpreadsheetApp.getUi().createAddonMenu()
        .addItem('Promo Codes', 'showSidebar')
        .addToUi();
}

function onInstall() {
    onOpen();
}

function showSidebar() {
    var ui = HtmlService.createHtmlOutputFromFile('Sidebar')
        .setTitle('Picatic Promo Codes');
    SpreadsheetApp.getUi().showSidebar(ui);
}

function getUser(apikey, eventStatus) {
    var options = {
        "contentType": "application/json",
        "headers": {
            "Accept": "application/json",
            "Authorization": "Bearer " + apikey,
        }
    }
    var response = UrlFetchApp.fetch("https://api.picatic.com/v2/user/me", options);
    var dataAll = JSON.parse(response.getContentText());
    var userid = dataAll.data.id
    var response1 = UrlFetchApp.fetch("https://api.picatic.com/v2/event?page[limit]=20&page[offset]=0&filter[user_id]=" + userid + "&filter[status]=" + eventStatus, options);
    var dataAll1 = JSON.parse(response1.getContentText());
    var dataSet = dataAll1.data;
    var rows = [],
        data;
    var choices = []

    for (i = 0; i < dataSet.length; i++) {
        data = dataSet[i];
        var eventname = data.attributes.title + " (" + data.attributes.start_date + ")"
        choices.push({
            "text": eventname,
            "value": data.id
        })
    }
    var eventoption = choices
    return (eventoption)
}

function Gettickets(eventid, apikey) {
    var apikey = apikey
    var options = {
        "contentType": "application/json",
        "headers": {
            "Accept": "application/json",
            "Authorization": "Bearer " + apikey,
        }
    }
    var response = UrlFetchApp.fetch("https://api.picatic.com/v2/ticket_price?filter[event_id]=" + eventid + "&page[limit]=20&page[offset]=0", options);
    var dataAll = JSON.parse(response.getContentText());
    var dataSet = dataAll.data; 
    var rows = [],
        data;
    var choices = []

    for (i = 0; i < dataSet.length; i++) {
        data = dataSet[i];
        var ticketname = data.attributes.name + "-$" + data.attributes.price
        choices.push({
            "text": ticketname,
            "value": data.id
        })
    }
    var option = choices
    return (option)
}

function CreatePromoCode(quantity, ticketid, discountprice, status, apikey, discountmethod) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet();
    var rows = sheet.getActiveRange();
    var numrows = rows.getNumRows();
    var codename = rows.getValues();

    var options = {
        "contentType": "application/json",
        "headers": {
            "Accept": "application/json",
            "Authorization": "Bearer " + apikey,
        }
    }
    var response = UrlFetchApp.fetch("https://api.picatic.com/v2/ticket_price/" + ticketid, options);
    var dataAll = JSON.parse(response.getContentText());
    var ticketprice = dataAll.data.attributes.price
    if (discountmethod == "percentage") {
        var discountprice = (1 - discountprice * 0.01) * ticketprice
    }

    for (var row = 0; row < numrows; row++) {
        if (codename[row] != '') {
            var code = codename[row][0]
            var data = {
                "data": {
                    "attributes": {
                        "code": code, // unique code
                        "limit": quantity, // how many tickets can be purchased, in total, with this promo code
                        "ticket_price_id": ticketid, // a ticket_price_id for the event
                        "status": status, // you can default it to inactive if you want to manually toggle them on from our management interface
                        "amount": discountprice.toFixed(2), // discounted price, 0.00 is free, any other amount will alter the price of the ticket
                        "type": 'fixed' // fixed is your only option
                    }
                }
            }
            var options = {
                "method": "post",
                "contentType": "application/json",
                "payload": JSON.stringify(data),
                "headers": {
                    "Accept": "application/json",
                    "Authorization": "Bearer " + apikey,
                }
            };
            var response = UrlFetchApp.fetch("https://api.picatic.com/v2/ticket_price_discount", options);
        }
    }
}

function querypromo(apikey, ticketname, ticketid, eventname, eventid) {
    var options = {
        "contentType": "application/json",
        "headers": {
            "Accept": "application/json",
            "Authorization": "Bearer " + apikey,
        }
    }
    var offset = 0
    var set = []
    var r = 0
    do {
        var response = UrlFetchApp.fetch("https://api.picatic.com/v2/ticket_price_discount?filter[ticket_price_id]=" + ticketid + "&page[limit]=50&page[offset]=" + offset, options);
        var dataAll = JSON.parse(response.getContentText());
        var dataSet = dataAll.data;
        if (dataSet.length > 0) {
            dataSet[0].ticketname = ticketname
        }
        var set = set.concat(dataSet)
        var looplength = dataSet.length
        Logger.log(looplength)
        var offset = 50 + 50 * r;
        r++;
    }
    while (looplength == 50);
    rendercode(set, eventname, eventid)
}

function rendercode(result, eventname, eventid) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(eventname + " promocodes")
    var ticketname = ""
    var rows = []

    for (var i = 0; i < result.length; i++) {
        var qleft = Number(result[i].attributes.limit) - Number(result[i].attributes.quantity_sold)
        var verifyname = result[i].ticketname
        var codelink = "https://www.picatic.com/manage/ticket_price_discounts/index/" + eventid + "#?edit=" + result[i].id
        if (verifyname) {
            var ticketname = verifyname
        }
        rows.push([result[i].attributes.code, ticketname, result[i].attributes.amount, result[i].attributes.limit,
            result[i].attributes.quantity_sold, qleft, result[i].attributes.status, result[i].attributes.start_date, result[i].attributes.end_date, codelink
        ])
    }
    var rowid = sheet.getLastRow() + 1
    dataRange = sheet.getRange(rowid, 1, rows.length, 10);
    dataRange.setValues(rows);
}

function getPromo(option, apikey, eventname, eventid) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var getsheets = ss.getSheets()
    var name = eventname + " promocodes"
    var check = 0
    
    for (var i = 0; i < getsheets.length; i++) {
        var sheetname = getsheets[i].getSheetName()
        if (name == sheetname) {
            var check = 1
        }
    }
    if (check == 0) {
        ss.insertSheet(eventname + " promocodes");
    }
    
    var sheet = ss.getSheetByName(eventname + " promocodes")
    sheet.clearContents()
    var headers = [
        ["Code Name", "Ticket", "Discounted Price", "Total Quantity", "Used", "Un-used", "Status", "Start Date", "End Date", "Update your code"]
    ]
    colHeader = sheet.getRange(1, 1, 1, 10);
    colHeader.setValues(headers)
    colHeader.setFontWeight("bold")

    for (var i = 0; i < option.length; i++) {
        var ticketname = option[i].text
        var ticketid = option[i].value
        querypromo(apikey, ticketname, ticketid, eventname, eventid)
    }
}
