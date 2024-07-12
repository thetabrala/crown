const isNum = require('./isNum.js');

module.exports = function (parent) {
    this.parent = parent;
    this.symbols = {};
    this.get = k => {
        var last = this.symbols;
        var o = k.split('.').filter(Boolean).reduce((p, c) => {
            if (!p) {
                return p;
            }
            var parts = c.split(/\[([0-9A-Za-z]+)\]/).filter(Boolean);
            if (parts.length > 0) {
                var current = p;
                parts.forEach(part => {
                    if (current) {
                        last = current;
                        current = isNum(part) ?
                            current[parseInt(part)] :
                            current[part];
                    }
                });
                return current;
            } else {
                last = p;
                return p ? p[c] : p;
            }
        }, last);
        if (o === undefined) {
            if (parent) {
                return parent.get(k);
            }
            throw new Error('Crown Scope: could not get symbol "' + k + '"');
        }
        if (typeof o === 'function') {
            var macro = o.macro;
            var bound = o.bind(last);
            bound.macro = macro;
            return bound;
        }
        return o;
    };
    this.set = (k, v) => {
        var last = this.symbols;
        k.split('.').filter(Boolean).forEach((c, i, a) => {
            c.split(/\[([0-9A-Za-z]+)\]/).filter(Boolean).forEach((pc, pi, pa) => {
                var key = isNum(pc) ? parseInt(pc) : pc;
                if (i === a.length - 1 && pi === pa.length - 1) {
                    last[key] = v;
                } else {
                    last = last[key];
                }
            });
        });
        return v;
    };
    return this;
}
