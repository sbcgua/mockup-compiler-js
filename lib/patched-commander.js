const commander = require('commander');

function patchCommander(commander) {
    commander.Command.prototype.collectAllOpts = function() {
        var allOpts = {};
        var node = this;
        while (node) {
            allOpts = node.options
                .map(o => o.attributeName())
                .filter(o => typeof node[o] !== 'function')
                .reduce((r, o) => ({[o]: node[o], ...r}), allOpts); // deeper opts enjoy priority
            node = node.parent;
        }
        return allOpts;
    };
    return commander;
}

module.exports = patchCommander(commander);
