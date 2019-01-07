//#!/usr/bin/env node

const Config    = require('./config');
const Crib      = require('./lib/crib');
const Dict      = require('./lib/dict');
const Gematria  = require('./lib/gematria');
const Input     = require('./lib/input');
const Key       = require('./lib/key');
const Log       = require('./lib/log');
const NodeIRC   = require('irc');
const Pastebin  = require('./lib/pastebin');
const Shift     = require('./lib/shift');
const Source    = require('./lib/source');
const Stats     = require('./lib/stats');
const Util      = require('./lib/util');

(() =>
{
    const idkfa = Options =>
    {
        // Set options
        const arrKeys           = Options.key.length > 0 ? Options.key : ['0'];
        const arrSourcePaths    = Options.source;

        const isReversedSource  = Options.invert.includes('t');
        const isInvertedKey     = Options.invert.includes('k');
        const isInvertedFuthark = Options.invert.includes('f');
        const isInvertedLatin   = Options.invert.includes('l');
        const isInvertedOffset  = Options.invert.includes('o');
        const isInvertedPrime   = Options.invert.includes('p');
        const isReversedShift   = Options.invert.includes('s');

        const isPatchedSource   = Options.patch.includes('s');
        const isNormalizedDict  = Options.patch.includes('d');

        const getKey            = Options.verbose.includes('k');
        const getChecksum       = Options.verbose.includes('x');
        const getIOC            = Options.verbose.includes('i');
        const getSource         = Options.verbose.includes('s');
        const getLatin          = Options.verbose.includes('l') || (Options.verbose.length === 0 && Options.find.length === 0 && Options.charAt.length === 0 && Options.wordAt.length === 0); //(!) beautify me
        const getFuthark        = Options.verbose.includes('f');
        const getPrime          = Options.verbose.includes('p');
        const getWordCount      = Options.verbose.includes('w');
        const getCharCount      = Options.verbose.includes('c');
        const getDictMatches    = Options.verbose.includes('d');

        const getCrib           = Options.find.length   > 0;
        const getCharAt         = Options.charAt.length > 0;
        const getWordAt         = Options.wordAt.length > 0;

        // Get source
        const sourceData = Source.getSource(arrSourcePaths, isPatchedSource, isReversedSource);

        if (!sourceData) throw new Error(`Please specify valid 'source' path.`);

        // Generate key(s)
        const keyData = Key.generate(arrKeys, Util.flatten(sourceData).length, isInvertedKey);

        // Do magic
        const cipherData = Shift.mutate(sourceData, keyData, isInvertedFuthark, isInvertedLatin, isInvertedOffset, isInvertedPrime, isReversedShift);

        Log.reset();

        // Generate data
        if (getSource) Log.setData('SOURCE', sourceData);

        if (getLatin) Log.setData('LATIN', cipherData);

        if (getFuthark) Log.setData('FUTHARK', Gematria.toFutharkDeep()(cipherData));

        if (getPrime) Log.setData('PRIME', Gematria.toPrimeDeep()(cipherData));

        if (getKey) Log.setData('KEYS', keyData);

        if (getCharCount) Log.setData('CHAR_COUNT', [[Stats.getCharCount(sourceData)]]);

        if (getWordCount) Log.setData('WORD_COUNT', [[Stats.getWordCount(sourceData)]]);

        if (getChecksum) Log.setData('CHECKSUM', cipherData.map(data => Stats.getChecksum(data)));

        if (getIOC) Log.setData('IOC', cipherData.map(data => Stats.getIOC(data)));

        if (getCharAt) Log.setData('CHAR_AT', cipherData.map(data => Options.charAt.map((item) => Stats.getCharAt(data, item))));

        if (getWordAt) Log.setData('WORD_AT', cipherData.map(data => Options.wordAt.map((item) => Stats.getWordAt(data, item))));

        if (getCrib) Log.setData(`CRIB: ${Options.find.join(' ').toUpperCase()}`, Crib.findCrib(sourceData, arrSourcePaths, Options.find));

        if (getDictMatches) Log.setData('MOST', Dict.getMost(cipherData, 5, isNormalizedDict));

        if (getDictMatches) Log.setData('LONGEST', Dict.getLongest(cipherData, 3, isNormalizedDict));

        //if (Options.key.length <= 0) Options.key.push(['0']); //(!) beautify me

        //Log.setData('OPTIONS', Object.assign({}, ...Object.keys(Options).map(strCommand => ({ [strCommand]: [...Options[strCommand]].sort((a, b) => a > b) }))));

        return Log.getData();
    };

    const parse = strCommand =>
    {
        // Will hold the options
        let mapOptions = new Map();

        // Get expressions from command string and remove single quotes
        let arrMathEx = strCommand.match(/'(.*?)'/gim);

        arrMathEx = arrMathEx ? arrMathEx.map(exp => exp.replace(/'/gm, '')) : null;

        // Remove expressions and unwanted chars from command
        let strNormalized = strCommand.replace(/'(.*?)'/gim, '').replace(/[^\w\u16A0-\u16FF-,. ]/gim, '');

        // Split into single commands
        let arrCommands = strNormalized.split(/[-]+/).filter(x => x);

        // Remove bot name
        let [, ...arrOptions] = arrCommands;

        // Add commands to optopns
        arrOptions.map(strOption =>
        {
            let [cmd, ...options] = strOption.split(' ').filter(x => x);

            mapOptions.set(cmd, options);
        });

        // Add math options
        if (mapOptions.has('k') && arrMathEx) mapOptions.set('k', mapOptions.get('k').concat(arrMathEx));

        // Check which options are set
        Object.keys(Config.input).map(item =>
        {
            // Get the command alias
            let strAlias = item.substr(0, 1);

            mapOptions.set(item, mapOptions.has(item) || mapOptions.has(strAlias) ? mapOptions.get(item) || mapOptions.get(strAlias) : []);
        });

        // Remove unknown options
        mapOptions.forEach((value, key) => { if (!Config.input[key]) mapOptions.delete(key); });

        return Array.from(mapOptions).reduce((obj, [key, value]) => (Object.assign(obj, { [key]: value })), {});
    };

    // Spawn bot
    const bot = new NodeIRC.Client(Config.irc.server, Config.irc.nick, Config.irc.options);

    // Add 'join' listener
    bot.addListener('join', (channel, nick) => { if (nick === Config.irc.nick) bot.say(channel, `Options: https://github.com/rtkd/idkfa`); });

    // Add 'message' listener
    bot.addListener('message#', (nick, to, text, message) =>
    {
        try
        {
            // Get message arguments
            let [, cmd] = message.args;

            // Check if msg is directed at bot, else just return null.
            if (cmd.substr(0, 2) !== Config.irc.botalias) return null;

            if (cmd.includes('help'))
            {
                bot.say(to, `Options: https://github.com/rtkd/idkfa`);
                return;
            }

            // Parse and validate options
            let options = Input.getOptions(parse(cmd));

            // Generate data
            let data = idkfa(options);

            // Stringify data
            let raw = JSON.stringify([...data]);

            // If data too long send to pastebin
            if (raw.length > 510) Pastebin.paste(JSON.stringify([...data]), Log.getNow(), response => bot.say(to, response));

            // Else echo data to IRC
            else [...data].map((item) => { bot.say(to, JSON.stringify(item)); });
        }

        catch (e) { bot.say(to, `${e}`); }
    });

    // Add 'private message' listener
    bot.addListener('pm', () => null);

    // Add listener for errors so we don't crash
    bot.addListener('error', () => null);

})();
