const isNum = require('./src/isNum.js');
const StringIterator = require('./src/StringIterator.js');
const Scope = require('./src/Scope.js');
const assert = require('assert');

function parseAtom(s) {
    if (isNum(s)) {
        return parseFloat(s);
    } else if (s === 'true') {
        return true;
    } else if (s === 'false') {
        return false;
    }
    return Symbol(s);
}

var reader = {};

reader.default = (scope, it) => {
    var result = it.current();
    while (!it.end()) {
        it.next();
        if (reader[it.current()] ||
            it.current() == ')') {
            return parseAtom(result);
        } else {
            result += it.current();
        }
    }
    return parseAtom(result);
}

reader[';'] = (scope, it) => {
    while (!it.end()) {
        it.next();
        if (it.current() === '\n') {
            it.next();
            it.next();
            return read(scope, it);
        }
    }
};

reader[' '] = (scope, it) => {
    it.next();
    return read(scope, it);
};

reader['\n'] = (scope, it) => {
    it.next();
    return read(scope, it);
};

reader['('] = (scope, it) => {
    var result = [];
    it.next();
    while (!it.end()) {
        if (it.current() === ')') {
            it.next();
            if (it.current() === '.') {
                it.next();
                return [Symbol('get'), read(scope, it), result];
            }
            if (it.current() === '[') {
                return [Symbol('get'), read(scope, it), result];
            }
            return result;
        }
        var a = read(scope, it);
        if (a) {
            result.push(a);
        }
    }
    if (it.current() === ')') {
        return result;
    }
    throw new Error('unbalanced parenthesis');
};

reader[')'] = (scope, it) => { };

reader['"'] = (scope, it) => {
    var result = '';
    while (!it.end()) {
        it.next();
        if (it.current() === '"') {
            it.next();
            return result;
        }
        result += it.current();
    }
    throw new Error('unbalanced string ' + result);
};

reader['\''] = (scope, it) => {
    it.next();
    return [Symbol('quote'), read(scope, it)];
};

reader['`'] = (scope, it) => {
    it.next();
    return [Symbol('backquote'), read(scope, it)];
};

reader[','] = (scope, it) => {
    it.next();
    return [Symbol('comma'), read(scope, it)];
};

reader['@'] = (scope, it) => {
    it.next();
    return [Symbol('splice'), read(scope, it)];
};

function read(scope, it) {
    return reader[it.current()] ?
        reader[it.current()](scope, it) :
        reader.default(scope, it);
}

var evaluator = {};

evaluator['splice'] = (scope, sexpr) => evaluate(scope, sexpr.slice(1));

evaluator['quote'] = (scope, sexpr) => sexpr[1];

evaluator['comma'] = (scope, sexpr) => {
    if (Array.isArray(sexpr[1])) {
        if (typeof sexpr[1][0] === 'symbol' && sexpr[1][0].description === 'comma') {
            return sexpr[1];
        }
    }
    return evaluate(scope, sexpr[1]);
}

function evalBq(scope, sexpr, isSplice = false) {
    if (!Array.isArray(sexpr)) {
        return sexpr;
    }
    var doSplice = [];
    var mapped = sexpr.map((e, i) => {
        if (Array.isArray(e)) {
            if (typeof e[0] === 'symbol' && e[0].description === 'comma') {
                var evald;
                if (Array.isArray(e[1])) {
                    if (typeof e[1][0] === 'symbol' && e[1][0].description === 'splice') {
                        doSplice.push(i);
                        evald = evaluate(scope, e[1][1]);
                    } else {
                        evald = evaluate(scope, e);
                    }
                } else {
                    evald = evaluate(scope, e[1]);
                }
                return evald;
            } else if (typeof e[0] === 'symbol' && e[0].description === 'backquote') {
                return evalBq(scope, e);
            } else {
                return evalBq(scope, e);
            }
        } else {
            return e;
        }
    });
    doSplice.forEach(i => {
        var toSplice = mapped.splice(i, 1);
        toSplice[0].reverse().forEach(e => {
            mapped.splice(i, 0, e);
        });
    });
    return mapped;
}

evaluator['backquote'] = (scope, sexpr) => evalBq(scope, sexpr[1]);

evaluator['object'] = (scope, sexpr) => {
    var obj = Object.create({});
    sexpr[1].forEach(pair => {
        assert(typeof pair[0] === 'symbol', 'evaluator object: not a symbol');
        obj[pair[0].description] = evaluate(scope, pair[1]);
    });
    return obj;
};

evaluator['let'] = (scope, sexpr) => {
    var ret = null;
    var subscope = new Scope(scope);
    sexpr[1].forEach(pair => {
        assert(typeof pair[0] === 'symbol', 'evaluator let: not a symbol');
        subscope.set(pair[0].description,
            evaluate(subscope, pair[1]));
    });
    sexpr.slice(2).forEach(body =>
        ret = evaluate(subscope, body));
    return ret;
};

evaluator['if'] = (scope, sexpr) =>
    evaluate(scope, sexpr[1]) ?
        evaluate(scope, sexpr[2]) :
        evaluate(scope, sexpr[3]);

evaluator['cond'] = (scope, sexpr) => {
    var conditions = sexpr.slice(1);
    var index = conditions.findIndex(pair => {
        return evaluate(scope, pair[0]) === true;
    });
    if (index !== -1) {
        return evaluate(scope, conditions[index][1]);
    }
};

evaluator['and'] = (scope, sexpr) =>
    sexpr.slice(1).map(e => evaluate(scope, e)).every(Boolean);

evaluator['or'] = (scope, sexpr) =>
    sexpr.slice(1).map(e => evaluate(scope, e)).some(Boolean);

evaluator['eq'] = (scope, sexpr) =>
    evaluate(scope, sexpr[1]) === evaluate(scope, sexpr[2]);

evaluator['neq'] = (scope, sexpr) =>
    evaluate(scope, sexpr[1]) !== evaluate(scope, sexpr[2]);

evaluator['lt'] = (scope, sexpr) =>
    evaluate(scope, sexpr[1]) < evaluate(scope, sexpr[2]);

evaluator['gt'] = (scope, sexpr) =>
    evaluate(scope, sexpr[1]) > evaluate(scope, sexpr[2]);

evaluator['*'] = (scope, sexpr) =>
    sexpr.slice(1).map(e => evaluate(scope, e)).reduce((p, c) => p * c);

evaluator['/'] = (scope, sexpr) =>
    sexpr.slice(1).map(e => evaluate(scope, e)).reduce((p, c) => p / c);

evaluator['-'] = (scope, sexpr) =>
    sexpr.slice(1).map(e => evaluate(scope, e)).reduce((p, c) => p - c);

evaluator['%'] = (scope, sexpr) =>
    sexpr.slice(1).map(e => evaluate(scope, e)).reduce((p, c) => p % c);

evaluator['+'] = (scope, sexpr) =>
    sexpr.slice(1).map(e => evaluate(scope, e)).reduce((p, c) => p + c);

evaluator['symbol'] = (scope, sexpr) => {
    var joined = sexpr.slice(1).map(e => {
        var evald = evaluate(scope, e);
        if (typeof evald === 'symbol') {
            return evaluate(scope, evald);
        }
        return evald;
    }).join('');
    return Symbol(joined);
};

evaluator['string'] = (scope, sexpr) => {
    var joined = sexpr.slice(1).map(e => {
        var evald = evaluate(scope, e);
        if (typeof evald === 'symbol') {
            return evald.description;
        }
        return evald;
    }).join('');
    return joined.toString();
};

evaluator['get'] = (scope, sexpr) => {
    assert(typeof sexpr[1] === 'symbol', 'evaluator get: not a symbol');
    if (sexpr.length === 3) {
        var second = evaluate(scope, sexpr[2]);
        return typeof second[sexpr[1].description] === 'function' ?
            second[sexpr[1].description].bind(second) :
            second[sexpr[1].description];
    } else if (typeof sexpr[1] === 'symbol') {
        return scope.get(sexpr[1].description);
    }
};

evaluator['set'] = (scope, sexpr) => {
    assert(typeof sexpr[1] === 'symbol', 'evaluator set: not a symbol');
    return scope.set(sexpr[1].description, evaluate(scope, sexpr[2]));
};

evaluator['try'] = (scope, sexpr) => {
    try {
        return evaluate(scope, sexpr[1]);
    } catch (err) {
        var subscope = new Scope(scope);
        subscope.set('error', err);
        return evaluate(subscope, sexpr[2]);
    }
};

evaluator['throw'] = (scope, sexpr) => {
    throw evaluate(scope, sexpr[1]);
};

evaluator['lambda'] = (scope, sexpr) => {
    return (...a) => {
        var subscope = new Scope(scope);
        var restSymbol = null;
        var restIndex = [];
        sexpr[1].forEach((arg, i) => {
            assert(typeof arg === 'symbol', 'lambda: not a symbol');
            if (arg.description === '&rest') {
                restSymbol = sexpr[1][i + 1];
                restIndex = i;
                return false;
            }
            subscope.set(arg.description, a[i]);
        });
        if (restSymbol) {
            subscope.set(restSymbol.description, a.slice(restIndex));
        }
        return evaluate(subscope, sexpr[2]);
    };
};

evaluator['macro'] = (scope, sexpr) => {
    var fn = evaluate(scope, [Symbol('lambda'), sexpr[1], sexpr[2]]);
    fn.macro = true;
    return fn;
};

function evaluate(scope, sexpr) {
    if (Array.isArray(sexpr)) {
        if (sexpr.length === 0) {
            return sexpr;
        }
        var first = evaluate(scope, sexpr[0]);
        if (typeof first === 'function') {
            return first.macro ?
                first.call(null,
                    ...sexpr.slice(1).map(e => typeof e === 'symbol' ? evaluate(scope, e) : e)) :
                first.call(null,
                    ...sexpr.slice(1).map(e => evaluate(scope, e)));
        }
        if (typeof first === 'symbol') {
            if (typeof evaluator[first.description] === 'function') {
                return evaluator[first.description](scope, sexpr);
            }
            return scope.get(first.description);
        }
        if (Array.isArray(first)) {
            return evaluate(scope, first);
        }
        throw new Error('not a function');
    }
    if (typeof sexpr === 'symbol') {
        try {
            return scope.get(sexpr.description);
        } catch (err) {
            if (typeof evaluator[sexpr.description] === 'function') {
                return sexpr;
            } else {
                throw err;
            }
        }
    }
    return sexpr;
}

var compiler = {};

compiler['set'] = (scope, sexpr, options) => {
    return '(' +
        compile(scope, sexpr[1], options) + ' = ' +
        compile(scope, sexpr[2], options) + ')';
};

compiler['get'] = (scope, sexpr, options) => {
    if (sexpr.length === 3) {
        return compile(scope, sexpr[2], options) + '.' +
            compile(scope, sexpr[1], options);
    } else {
        return compile(scope, sexpr[1], options);
    }
};

compiler['object'] = (scope, sexpr, options) => {
    return '({' + sexpr[1].map(pair => {
        assert(typeof pair[0] === 'symbol', 'compiler.object: not a symbol');
        return compile(scope, pair[0], options) + ' : ' +
            compile(scope, pair[1], options);
    }).join(',') + '})';
};

compiler['+'] = (scope, sexpr, options) =>
    '(' + sexpr.slice(1).map(e => compile(scope, e)).join(' + ') + ')';

compiler['-'] = (scope, sexpr, options) =>
    '(' + sexpr.slice(1).map(e => compile(scope, e)).join(' - ') + ')';

compiler['*'] = (scope, sexpr, options) =>
    '(' + sexpr.slice(1).map(e => compile(scope, e)).join(' * ') + ')';

compiler['/'] = (scope, sexpr, options) =>
    '(' + sexpr.slice(1).map(e => compile(scope, e)).join(' / ') + ')';

compiler['%'] = (scope, sexpr, options) =>
    '(' + sexpr.slice(1).map(e => compile(scope, e)).join(' % ') + ')';

compiler['and'] = (scope, sexpr, options) =>
    '(' + sexpr.slice(1).map(e => compile(scope, e)).join(' && ') + ')';

compiler['or'] = (scope, sexpr, options) =>
    '(' + sexpr.slice(1).map(e => compile(scope, e)).join(' || ') + ')';

compiler['eq'] = (scope, sexpr, options) =>
    '(' + sexpr.slice(1).map(e => compile(scope, e)).join(' === ') + ')';

compiler['neq'] = (scope, sexpr, options) =>
    '(' + sexpr.slice(1).map(e => compile(scope, e)).join(' !== ') + ')';

compiler['gt'] = (scope, sexpr, options) =>
    '(' + sexpr.slice(1).map(e => compile(scope, e)).join(' > ') + ')';

compiler['lt'] = (scope, sexpr, options) =>
    '(' + sexpr.slice(1).map(e => compile(scope, e)).join(' < ') + ')';

compiler['if'] = (scope, sexpr, options) =>
    '(() => (' + compile(scope, sexpr[1], options) + ') ?\n' +
    compile(scope, sexpr[2], options) + ':\n' +
    compile(scope, sexpr[3], options)
    + ')()';

compiler['cond'] = (scope, sexpr, options) => {
    var compiled = '(() => { ';
    compiled += 'if (' + compile(scope, sexpr[1][0], options) + ') { ' +
        'return ' + compile(scope, sexpr[1][1], options) + '; }';
    if (sexpr.length > 2) {
        compiled += ' else ';
    }
    compiled += sexpr.slice(2).map(pair => {
        return 'if (' + compile(scope, pair[0], options) + ') { ' +
            'return ' + compile(scope, pair[1], options) + '; } ';
    }).join('else ');
    return compiled + '})()';
}

function compileObject(scope, object, options) {
    if (Array.isArray(object)) {
        return '([' + object.map(o =>
            compileObject(scope, o, options)).join(',') + '])';
    } else if (typeof object === 'object') {
        return '({' + Object.keys(object).map(k =>
            k + ':' + compileObject(scope, object[k], options)).join(',\n') + '})';
    } else if (typeof object === 'string') {
        return '"' + object + '"';
    } else {
        return object.toString();
    }
}

compiler['quote'] = (scope, sexpr, options) => {
    return compileObject(scope, sexpr[1], options);
};

function compileBq(scope, sexpr, options) {
    if (!Array.isArray(sexpr)) {
        return compile(scope, sexpr, options);
    }
    if (typeof sexpr === 'symbol') {
        return compile(scope, sexpr, options);
    }
    return '([' + sexpr.map((e, i) => {
        if (Array.isArray(e)) {
            if (typeof e[0] === 'symbol' && e[0].description === 'comma') {
                if (Array.isArray(e[1])) {
                    if (typeof e[1][0] === 'symbol' && e[1][0].description === 'splice') {
                        return '...' + compile(scope, e[1][1], options);
                    } else {
                        return compile(scope, e[1], options);
                    }
                } else {
                    return compile(scope, e[1], options);
                }
            } else if (e[0] === 'backquote') {
                return compile(scope, e, options);
            } else {
                return compileBq(scope, e, options);
            }
        } else {
            return compile(scope, e, options);
        }
    }).join(',') + '])';
}

compiler['backquote'] = (scope, sexpr, options) => {
    return compileBq(scope, sexpr[1], options);
};

compiler['lambda'] = (scope, sexpr, options) => {
    var restSymbol = null;
    var restIndex = [];
    var args = sexpr[1];
    var length = args.length;
    var compiled = [];
    for (var i = 0; i < length; ++i) {
        if (args[i].description === '&rest') {
            ++i;
            compiled.push('...' + compile(scope, args[i], options));
        } else {
            compiled.push(compile(scope, args[i], options));
        }
    }
    return '((' + compiled.join(', ') + ') => {\n' +
        'return ' + compile(scope, sexpr[2], options) + ';\n})';
};

compiler['macro'] = (scope, sexpr, options) => {
    return '';
};

compiler['symbol'] = (scope, sexpr, options) => {
    return sexpr.slice(1).map(e => evaluate(scope, e)).join('');
};

compiler['string'] = (scope, sexpr, options) => {
    return sexpr.slice(1)
        .map(e => evaluate(scope, e))
        .map(e => compile(scope, e, options))
        .join('');
};

compiler['try'] = (scope, sexpr, options) => {
    return '(() => try { return ' + compile(scope, sexpr[1], options) + ';' +
        ' } catch(error) { return ' + compile(scope, sexpr[2], options) + '; })()';
};

compiler['throw'] = (scope, sexpr, options) => {
    return 'throw ' + compile(scope, sexpr[1], options);
};

compiler['let'] = (scope, sexpr, options) => {
    var subscope = new Scope(scope);
    var compiled = '(() => {\n';
    sexpr[1].forEach(pair => {
        try {
            var k = compile(scope, pair[0], options);
            var evald = evaluate(subscope, pair[1]);
            subscope.set(k, evald);
        } catch (err) {
            ;
        }
    });

    var bodies = sexpr.slice(2).map(body =>
        compile(subscope, body, options));
    bodies[bodies.length - 1] =
        'return ' + bodies[bodies.length - 1];

    var vars = sexpr[1].map(pair => {
        var k = compile(scope, pair[0], options);
        var e = compile(subscope, pair[1], options);
        if (!e) {
            return false;
        }
        return k.toString() + ' = ' + e;
    }).filter(Boolean);

    if (vars.length > 0) {
        compiled += 'let ' + vars.join(',\n') + ';\n';
    }

    return compiled + bodies.join(';\n') + ';\n})()';
};

function compileArgs(scope, sexpr, options) {
    return '(' + sexpr.slice(1).map(e => compile(scope, e, options)).join(',') + ')';
}

function compile(scope, sexpr, options) {
    if (Array.isArray(sexpr)) {
        if (sexpr.length === 0) {
            return '[]';
        }
        if (typeof sexpr[0] === 'symbol') {
            if (typeof compiler[sexpr[0].description] === 'function') {
                return compiler[sexpr[0].description](scope, sexpr, options);
            }
            try {
                var fn = scope.get(sexpr[0].description);
                if (typeof fn === 'function' && fn.macro === true) {
                    return compile(scope, evaluate(scope, sexpr), options);
                }
            } catch (err) {
                ;
            }
            return sexpr[0].description + compileArgs(scope, sexpr, options);
        } else {
            return compile(scope, sexpr[0], options) +
                compileArgs(scope, sexpr, options);
        }
    } else if (typeof sexpr === 'symbol') {
        return sexpr.description;
    } else if (typeof sexpr === 'string') {
        return '"' + sexpr + '"';
    } else {
        return sexpr.toString();
    }
}

module.exports = function () {
    var scope = new Scope();
    scope.set('read', (s) => read(scope, new StringIterator(s)));
    scope.set('readers', reader);
    scope.set('evaluate', (s) => evaluate(scope, read(scope, new StringIterator(s))));
    scope.set('evaluators', evaluator);
    scope.set('compile', (s) => compile(scope, read(scope, new StringIterator(s))));
    scope.set('compilers', compiler);
    return scope;
}



