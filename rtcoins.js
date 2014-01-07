
var laeh2 = require('laeh2').leanStacks(true).capturePrevious(true);
var _e = laeh2._e;
var _x = laeh2._x;

var crypto = require('crypto');
var request = require('request');
var _ = require('underscore');
var program = require('commander');
var utilz = require('utilz');
var fs = require('fs');
var cb = utilz.cb;
var dev = process.env.NODE_ENV === 'dev';
var baseUrl = 'http://www.rtcoins' + (dev ? '2' : '') + '.com/api/v1/';
var anonApiKey = 'ywUiwpKjsKvsqDut1NXmgL00nBJW51wt';
var verbose;
var conf;

function req(cmd) { // cmd, arg1, arg2, argN, cb(err, res)

    // www.rtcoins.com/api/v1/func/arg1/arg2/argN

    var args = {};
    var url = [];
    var aa = arguments;
    var cb = aa[aa.length - 1];

    for(var i = 0, ln = aa.length - 1; i < ln; i++) {
        var v = aa[i];
        args[v] = i;
        url.push(encodeURIComponent(v));
    }

    var sig = utilz.sign(args, conf.key, true);
    url.push(args.ts);
    url.push(sig);

    var opts = {
        url: baseUrl + url.join('/'),
        json: true
    };

    if(verbose)
        console.log('request: %s', opts.url);

    request(opts, _x(cb, true, function(err, res, json) {
        if(res.statusCode !== 200)
            _e('invalid response status code: [%s] [%s]', res.statusCode, json);

        if(cmd === 'login' && json.apikey) {
            conf.key = json.apikey;
            saveConf();
        }
        else if(cmd === 'logout') {
            conf.key = anonApiKey;
            saveConf();
        }

        console.log(JSON.stringify(json, null, '  '));
        cb();
    }));
}

function loadConf() {
    if(fs.existsSync('.config')) {
        if(verbose)
            console.log('loading .config');
        conf = JSON.parse(fs.readFileSync('.config', 'utf8'));
    }
    else {
        if(verbose)
            console.log('.config does not exist, will create one');
        conf = {
            key: anonApiKey
        };
    }
}

function saveConf() {
    if(verbose)
        console.log('saving .config');
    fs.writeFileSync('.config', JSON.stringify(conf, null, '  '));
}

exports.cmdline = function() {

    program
        .option('--verbose', 'print more info')

        .option('--register <email> <pass> <fname> <lname>', 'register a new user account')
        .option('--delete-account <email>', 'delete user account')

        .option('--block-account <email>', 'block the user account (admin)')
        .option('--unblock-account <email>', 'unblock the user account (admin)')

        .option('--login <email> <pass> [authy]', 'user login; writes api key into .config')
        .option('--logout', 'user logout; removes api key from .config')

        .option('--init-pass-reset <email>', 'initiate password reset')
        .option('--finish-pass-reset <code> <password>', 'finish password reset')

        .option('--sell <market> <amount>', 'place sell order')
        .option('--buy <market> <amount>', 'place buy order')
        .option('--orders [market]', 'list my orders for a market, or all my orders')
        .option('--cancel <order-id>', 'cancel an order')

        .option('--markets', 'list all markets')
        .option('--depth <market>', 'list sell/buy orders for a merket')
        .option('--trades <market>', 'list trade history for a market')
        .option('--my-trades [market]', 'list my trade history for a market')

        .option('--chart [market]', 'list candlestick chart data for a market')

        .option('--transfer <email-from> <email-to> <currency-code> <amount>', 'transfer coins between two users')

        .option('--balances', 'list my balances')
        .option('--my-markets', 'list the markets i am active in')

        .option('--deposit-address <currency>', 'generate a new deposit address')
        .option('--withdraw <currency> <amount> <address>', 'initiate a withdrawal transaction')

        .option('--consolidate <email> <currency>', 'initiate consolidation transfer from user wallet to currency wallet (admin)')
        .option('--simulate-deposit <email> <currency> <amount> <source-address>', 'simulate a deposit (admin)')

        .parse(process.argv);

    verbose = program.verbose;
    loadConf();
    var aa = program.args;

    if(program.register) {
        var email = program.register;
        var pass = aa[0];
        var fname = aa[1];
        var lname = aa[2];
        pass = crypto.createHash('sha256').update(pass).digest('hex');
        req('register', email, pass, fname, lname, cb);
    }
    else if(program.deleteAccount) {
        var email = program.deleteAccount;
        req('delete-account', email, cb);
    }
    else if(program.blockAccount) {
        var email = program.blockAccount;
        req('block-account', email, cb);
    }
    else if(program.unblockAccount) {
        var email = program.unblockAccount;
        req('unblock-account', email, cb);
    }
    else if(program.login) {
        var email = program.login;
        var pass = aa[0];
        var authy = aa[1]; // optional
        req('login', email, pass, authy, cb);
    }
    else if(program.logout) {
        req('logout', cb);
    }
    else if(program.initPassReset) {
        var email = program.initPassReset;
        req('reset-password', email, cb);
    }
    else if(program.finishPassReset) {
        var email = program.finishPassReset;
        var code = aa[0];
        req('confirm-password', code, cb);
    }
    else if(program.sell) {
        var market = program.sell;
        var amount = Number(aa[0]);
        req('sell', market, amount, cb);
    }
    else if(program.buy) {
        var market = program.buy;
        var amount = Number(aa[0]);
        req('buy', market, amount, cb);
    }
    else if(program.orders) {
        var market = program.orders; // optional
        req('orders', market, cb);
    }
    else if(program.cancel) {
        var orderid = program.cancel;
        req('cancel', orderid, cb);
    }
    else if(program.markets) {
        req('markets', cb);
    }
    else if(program.depth) {
        var market = program.depth;
        req('depth', market, cb);
    }
    else if(program.trades) {
        var market = program.trades;
        req('trades', market, cb);
    }
    else if(program.myTrades) {
        var market = program.myTrades; // optional
        req('my-trades', market, cb);
    }
    else if(program.chart) {
        var market = program.chart;
        req('chart', market, cb);
    }
    else if(program.transfer) {
        var emailFrom = program.transfer;
        var emailTo = aa[0];
        var currency = aa[1];
        var amount = Number(aa[2]);
        req('transfer', emailFrom, emailTo, currency, amount, cb);
    }
    else if(program.balances) {
        req('balances', cb);
    }
    else if(program.myMarkets) {
        req('my-markets', cb);
    }
    else if(program.depositAddress) {
        var currency = program.depositAddress;
        req('deposit-address', currency, cb);
    }
    else if(program.withdraw) {
        var currency = program.withdraw;
        var amount = Number(aa[0]);
        var address = aa[1];
        req('withdraw', currency, amount, address, cb);
    }
    else if(program.consolidate) {
        var email = program.consolidate;
        var currency = aa[0];
        req('consolidate', email, currency, cb);
    }
    else if(program.simulateDeposit) {
        var email = program.simulateDeposit;
        var currency = aa[0];
        var amount = Number(aa[1]);
        var sourceAddress = aa[2];
        req('simulate-deposit', email, currency, amount, sourceAddress, cb);
    }
};

if(require.main === module)
    exports.cmdline();

