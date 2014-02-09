
var laeh2 = require('laeh2').leanStacks(true).capturePrevious(true);
var _e = laeh2._e;
var _x = laeh2._x;

var crypto = require('crypto');
var request = require('request');
var _ = require('underscore');
var program = require('commander');
var utilz = require('utilz');
var fs = require('fs');
var path = require('path');
var cb = utilz.cb;
var dev = process.env.NODE_ENV === 'dev';
var baseUrl = 'http://www.rtcoins' + (dev ? '2' : '') + '.com/api/v1/';
var anonEmail = 'anonymous@rtcoins.com';
var anonApiKey = 'ywUiwpKjsKvsqDut1NXmgL00nBJW51wt';
var home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
var config = path.join(home, '.rtcoins.json');
var verbose;
var conf;

function req(cmd) { // cmd, arg1, arg2, argN, cb(err, res)

    // www.rtcoins.com/api/v1/func/arg1/arg2/argN/identity/ts/sig

    var args = {};
    var url = [];
    var aa = arguments;
    var cb = aa[aa.length - 1];

    for(var i = 0, ln = aa.length - 1; i < ln; i++) {
        var v = aa[i];
        args[String(i)] = v;
        url.push(encodeURIComponent(v === null ? '\0' : v));
    }

    args[String(i++)] = conf.email;
    url.push(encodeURIComponent(conf.email));

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

        if(res.statusCode === 500 && json && json.error && json.error.message && !verbose) {
            console.log(json.error.message);
            process.exit(1);
        }

        if(res.statusCode !== 200)
            _e('invalid response status code: [%s] [%j]', res.statusCode, json);

        if(cmd === 'login' && json.apikey) {
            conf.email = json.uid;
            conf.key = json.apikey;
            saveConf();
        }
        else if(cmd === 'logout') {
            conf.email = anonEmail;
            conf.key = anonApiKey;
            saveConf();
        }

        console.log(JSON.stringify(json, null, '  '));
        cb();
    }));
}

function loadConf() {
    if(fs.existsSync(config)) {
        if(verbose)
            console.log('loading %s', config);
        conf = JSON.parse(fs.readFileSync(config, 'utf8'));
    }
    else {
        if(verbose)
            console.log('%s does not exist, creating one', config);
        conf = {
            email: anonEmail,
            key: anonApiKey
        };
        saveConf();
    }
}

function saveConf() {
    if(verbose)
        console.log('saving %s', config);
    fs.writeFileSync(config, JSON.stringify(conf, null, '  '));
}

function opt(param) {
    return param === true || !param ? null : param;
}

function number(n) {
    var a = Number(n);
    if(isNaN(a))
        _e('Not a number: ' + n);
    if(a < 0)
        _e('Number must be positive: ' + n);
    return a;
}

exports.cmdline = function() {

    program
        .option('-v, --verbose', 'print more info')

        .option('--register <email> <pass> <fname> <lname>', 'register a new user account')
        .option('--confirm-account <email> <code>', 'confirm a newly created account')
        .option('--delete-account [email]', 'delete user account')

        .option('--login <email> <pass> [authy]', 'user login; writes email and api key into .config')
        .option('--logout', 'user logout; removes email and api key from .config')

        .option('--block-account <email>', 'block the user account (admin)')
        .option('--unblock-account <email>', 'unblock the user account (admin)')

        .option('--init-pass-reset <email>', 'initiate password reset')
        .option('--finish-pass-reset <email> <code> <new password>', 'finish password reset')

        .option('--deposit-address <currency>', 'show deposit address for the given currency')
        .option('--cron-blockchain <currency>', 'trigger cron processing for a currency blockchain (admin only; test-mode only)')
        .option('--transfer <email-to> <currency> <amount incl. transfer fee>', 'transfer coins to another user')
        .option('--balance [currency]', 'list balance for a currency or all currencies with non-zero balance')
        .option('--withdraw <currency> <address> <amount incl. withdrawal fee>', 'initiate a withdrawal transaction')

        .option('--markets', 'list all markets')
        .option('--sell <market> <amount> <price>', 'place sell/ask order')
        .option('--buy <market> <amount> <price>', 'place buy/bid order')
        .option('--cancel <order-id>', 'cancel an order')

        .option('--my-markets [days]', 'list markets where i am active (defaults to 1 day)')
        .option('--my-orders [market]', 'list my orders for a market, or all my orders')
        .option('--my-trades <market>', 'list my trade history for a market')

        .option('--depth <market>', 'list current sell/buy orders for a market')
        .option('--trades <market>', 'list current trade history for a market')
        .option('--chart <market> [1m|5m|15m|30m|1h|6h|12h|1d|3d|1w]', 'display candlestick chart data at the given frequency')
        .option('--feed <market> [trade|order|all]', 'subscribe to the market data feed')

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
    else if(program.confirmAccount) {
        var email = program.confirmAccount;
        var code = aa[0];
        req('confirm-account', email, code, cb);
    }
    else if(program.deleteAccount) {
        var email = program.deleteAccount;
        req('delete-account', opt(email), cb);
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
        // todo: read the password by prompt
        var email = program.login;
        var pass = crypto.createHash('sha256').update(aa[0]).digest('hex');
        var authy = aa.length > 1 ? aa[1] : null; // optional
        req('login', email, pass, opt(authy), cb);
    }
    else if(program.logout) {
        req('logout', cb);
    }
    else if(program.initPassReset) {
        var email = program.initPassReset;
        req('init-pass-reset', email, cb);
    }
    else if(program.finishPassReset) {
        var email = program.finishPassReset;
        var code = aa[0];
        var pass = crypto.createHash('sha256').update(aa[1]).digest('hex');
        req('finish-pass-reset', email, code, pass, cb);
    }


    else if(program.depositAddress) {
        var currency = program.depositAddress;
        req('deposit-address', currency, cb);
    }
    else if(program.cronBlockchain) {
        var currency = program.cronBlockchain; // optional
        req('cron-blockchain', opt(currency), cb);
    }
    else if(program.transfer) {
        var emailTo = program.transfer;
        var currency = aa[0];
        var amount = number(aa[1]);
        req('transfer', emailTo, currency, amount, cb);
    }
    else if(program.balance) {
        var currency = program.balance; // optional
        req('balance', opt(currency), cb);
    }
    else if(program.withdraw) {
        var currency = program.withdraw;
        var address = aa[0];
        var amount = number(aa[1]);
        req('withdraw', currency, address, amount, cb);
    }


    else if(program.markets) {
        req('markets', cb);
    }
    else if(program.sell) {
        var market = program.sell;
        var amount = number(aa[0]);
        var price = number(aa[1]);
        req('sell', market, amount, price, cb);
    }
    else if(program.buy) {
        var market = program.buy;
        var amount = number(aa[0]);
        var price = number(aa[1]);
        req('buy', market, amount, price, cb);
    }
    else if(program.cancel) {
        var orderid = program.cancel;
        req('cancel', orderid, cb);
    }


    else if(program.myMarkets) {
        var days = program.myMarkets !== true ? number(program.myMarkets) : null; // optional
        req('my-markets', opt(days), cb);
    }
    else if(program.myOrders) {
        var market = program.myOrders; // optional
        req('my-orders', opt(market), cb);
    }
    else if(program.myTrades) {
        var market = program.myTrades;
        req('my-trades', market, cb);
    }


    else if(program.depth) {
        var market = program.depth;
        req('depth', market, cb);
    }
    else if(program.trades) {
        var market = program.trades;
        req('trades', market, cb);
    }
    else if(program.chart) {
        var market = program.chart;
        var freq = aa.length > 0 ? aa[0] : null; // optional
        req('chart', market, opt(days), cb);
    }
    else if(program.feed) {
        var market = program.feed;
        var type = aa.length > 0 ? aa[0] : null; // optional
        req('feed', market, opt(type), cb);
    }

    else {
        console.log(program.help());
    }
};

if(require.main === module)
    exports.cmdline();
