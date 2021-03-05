//#!/usr/bin/env node

const Args      = require('command-line-args');
const Config    = require('../config');
const Crib      = require('../lib/crib');
const Dict      = require('../lib/dict');
const Gematria  = require('../lib/gematria');
const Input     = require('../lib/input');
const Key       = require('../lib/key');
const Log       = require('../lib/log');
const Shift     = require('../lib/shift');
const Source    = require('../lib/source');
const Stats     = require('../lib/stats');
const Util      = require('../lib/util');


const idkfa = (()=>
{
const process = (Arguments) =>
{
    try
    {

        Log.writeLine("Arguments");
	Log.writeLine(Arguments);
        // Validate input
        const Options = Input.getOptions(Arguments);
        Log.writeLine("Options");
	Log.writeLine(Options);

        // Set options
        const arrKeys           = Options.key;
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
        const getLatin          = Options.verbose.includes('l');
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

        if (getCrib) Log.setData('CRIB', Crib.findCrib(sourceData, arrSourcePaths, Options.find));

        if (getDictMatches) Log.setData('DICT_MOST', Dict.getMost(cipherData, 5, isNormalizedDict));

        if (getDictMatches) Log.setData('DICT_LONGEST', Dict.getLongest(cipherData, 3, isNormalizedDict));

        Log.setData('OPTIONS', Object.assign({}, ...Object.keys(Options).map(strCommand => ({ [strCommand]: [...Options[strCommand]].sort((a, b) => a > b) }))));

        // Log data
        Log.writeData();

    }

    catch (e) { Log.writeError(`${e}`); }
};
	return {process};
})();

/*
(() =>
{

        // Parse input fom CLI.
        const CLA = Args(Config.cla, { partial: true });
	process(CLA);
})();
*/

module.exports = idkfa;
global.idkfa=idkfa;
