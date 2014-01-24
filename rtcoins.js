
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
    return param === true ? null : param;
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
        .option('--transfer <email-to> <currency> <amount>', 'transfer coins to another user')
        .option('--balance [currency]', 'list balance for a currency or all currencies with non-zero balance')
        .option('--withdraw <currency> <amount> <address>', 'initiate a withdrawal transaction')

        .option('--sell <market> <amount>', 'place sell order')
        .option('--buy <market> <amount>', 'place buy order')
        .option('--cancel <order-id>', 'cancel an order')
        .option('--orders [market]', 'list my orders for a market, or all my orders')

        .option('--markets', 'list all markets')
        .option('--depth <market>', 'list sell/buy orders for a merket')
        .option('--trades <market>', 'list trade history for a market')
        .option('--my-trades <market>', 'list my trade history for a market')
        .option('--chart <market>', 'list candlestick chart data for a market')

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
        var authy = aa[1]; // optional
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
        var amount = Number(aa[1]);
        req('transfer', emailTo, currency, amount, cb);
    }
    else if(program.balance) {
        var currency = program.balance; // optional
        req('balance', opt(currency), cb);
    }
    else if(program.withdraw) {
        var currency = program.withdraw;
        var amount = Number(aa[0]);
        var address = aa[1];
        req('withdraw', currency, amount, address, cb);
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
    else if(program.cancel) {
        var orderid = program.cancel;
        req('cancel', orderid, cb);
    }


    else if(program.orders) {
        var market = program.orders; // optional
        req('orders', opt(market), cb);
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
        var market = program.myTrades;
        req('my-trades', market, cb);
    }
    else if(program.chart) {
        var market = program.chart;
        req('chart', market, cb);
    }
};

if(require.main === module)
    exports.cmdline();
