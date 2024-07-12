const StringIterator = require('./src/StringIterator.js');
const Scope = require('./src/Scope.js');
const crown = require('./index.js');
const assert = require('assert');

function assertThrows(fn, m) {
    var thrown = false;
    try {
        fn.call();
    } catch (err) {
        thrown = true;
    }
    assert(thrown, m);
}

function test() {
    function testStringIterator() {
        var it;
        it = new StringIterator('12345');
        assert(it.current() === '1', 'testStringIterator current');
        it.next();
        assert(it.current() === '2', 'testStringIterator current');
        it.next();
        assert(it.current() === '3', 'testStringIterator current');
        it.next();
        assert(it.current() === '4', 'testStringIterator current');
        it.next();
        assert(it.current() === '5', 'testStringIterator current');
        assert(it.end() === true, 'testStringIterator end');
    }
    function testReader() {
        var scope = crown();
        var parsed;
        parsed = scope.get('read')(`(let
  ()())`);
        assert(Array.isArray(parsed), 'testReader new lines let');
        parsed = scope.get('read')(`
  ((())
  ())`);
        assert(Array.isArray(parsed), 'testReader new lines');
        parsed = scope.get('read')(`(;;\n 1.1)`);
        assert(Array.isArray(parsed), 'testReader line comment');
        assert(parsed[0] === 1.1, 'testReader line comment');
        parsed = scope.get('read')(`        (1.1)`);
        assert(Array.isArray(parsed), 'testReader preceding whitespace');
        assert(parsed[0] === 1.1, 'testReader preceding whitespace');
        parsed = scope.get('read')('"string"');
        assert(parsed === 'string', 'testReader string');
        parsed = scope.get('read')('true');
        assert(parsed === true, 'testReader boolean true');
        parsed = scope.get('read')('false');
        assert(parsed === false, 'testReader boolean false');
        assertThrows(() => scope.get('read')('"(((((((()'), 'testReader unbalanced parenthesis does not throw error');
        parsed = scope.get('read')(`()`);
        assert(Array.isArray(parsed), 'testReader empty list');
        assert(parsed.length === 0, 'testReader empty list');
        parsed = scope.get('read')(`(sym 1 "s" 3.2 (1 2 3))`);
        assert(Array.isArray(parsed), 'testReader list');
        assert(parsed.length === 5, 'testReader list length');
        assert(typeof parsed[0] === 'symbol', 'testReader list symbol is symbol');
        assert(parsed[0].description === 'sym', 'testReader list symbol is symbol value');
        assert(parsed[1] === 1, 'testReader list number');
        assert(parsed[2] === 's', 'testReader list string');
        assert(parsed[3] === 3.2, 'testReader list float/double');
        assert(Array.isArray(parsed[4]), 'testReader list sub list');
        assert(parsed[4].length === 3, 'testReader list sub list length');
        assert(parsed[4][0] === 1, 'testReader list sub list element 0');
        assert(parsed[4][1] === 2, 'testReader list sub list element 1');
        assert(parsed[4][2] === 3, 'testReader list sub list element 2');
        parsed = scope.get('read')(`symbol.property`);
        assert(typeof parsed === 'symbol', 'testReader symbol.property is list');
        assert(parsed.description === 'symbol.property', 'testReader symbol.property is property');
        parsed = scope.get('read')(`().property`);
        assert(Array.isArray(parsed), 'testReader list property');
        assert(typeof parsed[0] === 'symbol', 'testReader list property get');
        assert(typeof parsed[1] === 'symbol', 'testReader list property key is symbol');
        assert(parsed[1].description === 'property', 'testReader list property key');
        assert(Array.isArray(parsed[2]), 'testReader list property value is list');
        parsed = scope.get('read')(`(1)[0]`);
        assert(Array.isArray(parsed), 'testReader list property index');
        assert(typeof parsed[0] === 'symbol', 'testReader list property get index');
        assert(parsed[0].description === 'get', 'testReader list property get index');
        assert(typeof parsed[1] === 'symbol', 'testReader list property key index is symbol');
        assert(parsed[1].description === '[0]', 'testReader list property key index');
        parsed = scope.get('read')(`(1).property[0].name`);
        assert(Array.isArray(parsed), 'testReader list property index');
        assert(typeof parsed[1] === 'symbol', 'testReader list property key is symbol');
        assert(parsed[1].description === 'property[0].name', 'testReader list property key');
        assert(Array.isArray(parsed[2]), 'testReader list property value islist');
        assert(parsed[2][0] === 1, 'testReader list property get object');
        parsed = scope.get('read')(`'(1)`);
        assert(Array.isArray(parsed), 'testReader quote is list');
        assert(typeof parsed[0] === 'symbol', 'testReader quote symbol');
        assert(parsed[0].description === 'quote', 'testReader quote symbol');
        assert(Array.isArray(parsed[1]), 'testReader quote arg is list');
        parsed = scope.get('read')(`,(1 ,())`);
        assert(Array.isArray(parsed), 'testReader comma is list');
        assert(typeof parsed[0] === 'symbol', 'testReader comma is symbol');
        assert(parsed[0].description === 'comma', 'testReader comma');
        assert(Array.isArray(parsed[1]), 'testReader comma arg is list');
        parsed = scope.get('read')(`@(1 @())`);
        assert(Array.isArray(parsed), 'testReader splice is list');
        assert(typeof parsed[0] === 'symbol', 'testReader splice is symbol');
        assert(parsed[0].description === 'splice', 'testReader splice');
        assert(Array.isArray(parsed[1]), 'testReader splice arg is list');
        parsed = scope.get('read')(`\`(1 @())`);
        assert(Array.isArray(parsed), 'testReader backquote is list');
        assert(typeof parsed[0] === 'symbol', 'testReader backquote is symbol');
        assert(parsed[0].description === 'backquote', 'testReader backquote');
        assert(Array.isArray(parsed[1]), 'testReader backquote arg is list');
    }
    function testScope() {
        var scope = crown();
        scope.set('n', 100);
        assert(scope.get('n') === 100, 'testScope set/get number');
        scope.set('s', 's');
        assert(scope.get('s') === 's', 'testScope set/get string');
        scope.set('f', () => 1);
        assert(scope.get('f')() === 1, 'testScope set/get function');
        scope.set('l', [1, 2, 3]);
        assert(Array.isArray(scope.get('l')), 'testScope set/get list');
        scope.set('o', { a: 1 });
        assert(scope.get('o').a === 1, 'testScope set/get list');
        var subscope = new Scope(scope);
        subscope.set('n', 2);
        assert(subscope.get('n') === 2, 'testScope subscope set/get override');
        assert(subscope.get('s') === 's', 'testScope subscope set/get parent');
        assertThrows(() => subscope.get('undef'), 'testScope get undefined symbol');
        scope.set('a', { b: { c: [1] } });
        assert(scope.get('a.b.c.0') === 1, 'testScope set/get properties');
        scope.set('a.b.c.0', 100);
        assert(scope.get('a.b.c.0') === 100, 'testScope set/get properties');
        scope.set('ar', [1, 2, 3]);
        assert(scope.get('ar[0]') === 1, 'testScope array access');
        assert(scope.get('ar[1]') === 2, 'testScope array access');
        assert(scope.get('ar[2]') === 3, 'testScope array access');
        scope.set('am', [[1, 2, 3]]);
        assert(scope.get('am[0][0]') === 1, 'testScope multi-dimensional array access');
        assert(scope.get('am[0][1]') === 2, 'testScope multi-dimensional array access');
        assert(scope.get('am[0][2]') === 3, 'testScope multi-dimensional array access');
        scope.set('am[0][0]', 300);
        assert(scope.get('am[0][0]') === 300, 'testScope multi-dimensional array set');
        scope.set('amo', [[1, 2, { a: 4 }]]);
        assert(scope.get('amo[0][2].a') === 4, 'testScope multi-dimensional array object access');
        scope.set('bind', { v: 1, a: function () { return this.v * 2; } });
        var fn = scope.get('bind.a');
        assert(typeof fn === 'function', 'testScope bind not a function');
        var result = fn.call(null);
        assert(result === 2, 'testScope bound function result');
    }
    function testEvaluatorTypes() {
        var scope = crown();
        var evald;
        scope.set('known', 2);
        evald = scope.get('evaluate')(`known`);
        assert(evald === 2, 'testEvaluatorTypes known symbol does not return value');
        assertThrows(() => scope.get('evaluate')(`sym`), 'testEvaluatorTypes symbol unknown does not throw');
        evald = scope.get('evaluate')(`'sym`);
        assert(typeof evald === 'symbol', 'testEvaluatorTypes symbol');
        assert(evald.description === 'sym', 'testEvaluatorTypes symbol');
        evald = scope.get('evaluate')(`1`);
        assert(evald === 1, 'testEvaluatorTypes number');
        evald = scope.get('evaluate')(`1.1`);
        assert(evald === 1.1, 'testEvaluatorTypes number float/double');
        evald = scope.get('evaluate')(`"string"`);
        assert(evald === "string", 'testEvaluatorTypes string');
        evald = scope.get('evaluate')(`true`);
        assert(evald === true, 'testEvaluatorTypes boolean true');
        evald = scope.get('evaluate')(`false`);
        assert(evald === false, 'testEvaluatorTypes boolean true');
        evald = scope.get('evaluate')(`()`);
        assert(Array.isArray(evald), 'testEvaluatorTypes empty list');
        evald = scope.get('evaluate')(`'(1 2)`);
        assert(evald.length === 2, 'testEvaluatorTypes list length');
        assert(evald[0] === 1, 'testEvaluatorTypes list value');
        assert(evald[1] === 2, 'testEvaluatorTypes list value');
    }
    function testEvaluatorSymbol() {
        var scope = crown();
        var evald;
        scope.set('a', { b: 200 });
        evald = scope.get('evaluate')(`(symbol "a" "." "b")`);
        assert(typeof evald === 'symbol', 'testEvaluatorSymbol creates a symbol reference');
        assert(evald.description === 'a.b', 'testEvaluatorSymbol creates a symbol reference');
    }
    function testEvaluatorString() {
        var scope = crown();
        var evald;
        scope.set('a', { b: 200 });
        evald = scope.get('evaluate')(`(string symbol)`);
        assert(evald === 'symbol', 'testEvaluatorString creates a string from a symbol reference');
    }
    function testEvaluatorObject() {
        var scope = crown();
        var evald;
        evald = scope.get('evaluate')(`(object ((name "james")))`);
        assert(typeof evald === 'object', 'testEvaluatorTypes object');
        assert(evald.name === 'james', 'testEvaluatorTypes object value');
    }
    function testEvaluatorAddition() {
        var scope = crown();
        var evald;
        evald = scope.get('evaluate')(`(+ 2 2)`);
        assert(evald === 4, 'number addition');
        evald = scope.get('evaluate')(`(+ "string1" "string2")`);
        assert(evald === 'string1string2', 'testEvaluatorAddition string concatenation');
    }
    function testEvaluatorSubtraction() {
        var scope = crown();
        var evald;
        evald = scope.get('evaluate')(`(- 3 2)`);
        assert(evald === 1, 'testEvaluatorSubtraction number subtraction');
    }
    function testEvaluatorMultiplication() {
        var scope = crown();
        var evald;
        evald = scope.get('evaluate')(`(* 3 3)`);
        assert(evald === 9, 'testEvaluatorMultiplication number multiplication');
    }
    function testEvaluatorDivision() {
        var scope = crown();
        var evald;
        evald = scope.get('evaluate')(`(/ 4 2)`);
        assert(evald === 2, 'testEvaluatorDivision number division');
    }
    function testEvaluatorModulo() {
        var scope = crown();
        var evald;
        evald = scope.get('evaluate')(`(% 5 2)`);
        assert(evald === 1, 'testEvaluatorModulo number mod');
    }
    function testEvaluatorEq() {
        var scope = crown();
        var evald;
        evald = scope.get('evaluate')(`(eq 4 2)`);
        assert(evald === false, 'testEvaluatorEq false');
        evald = scope.get('evaluate')(`(eq 2 2)`);
        assert(evald === true, 'testEvaluatorEq true');
    }
    function testEvaluatorNeq() {
        var scope = crown();
        var evald;
        evald = scope.get('evaluate')(`(neq 2 2)`);
        assert(evald === false, 'testEvaluatorNeq false');
        evald = scope.get('evaluate')(`(neq 4 2)`);
        assert(evald === true, 'testEvaluatorNeq true');
    }
    function testEvaluatorGt() {
        var scope = crown();
        var evald;
        evald = scope.get('evaluate')(`(gt 2 2)`);
        assert(evald === false, 'testEvaluatorGt false');
        evald = scope.get('evaluate')(`(gt 4 2)`);
        assert(evald === true, 'testEvaluatorGt true');
    }
    function testEvaluatorLt() {
        var scope = crown();
        var evald;
        evald = scope.get('evaluate')(`(lt 2 2)`);
        assert(evald === false, 'testEvaluatorLt false');
        evald = scope.get('evaluate')(`(lt 1 2)`);
        assert(evald === true, 'testEvaluatorLt true');
    }
    function testEvaluatorAnd() {
        var scope = crown();
        var evald;
        evald = scope.get('evaluate')(`(and (eq 1 1) (eq 2 2))`);
        assert(evald === true, 'testEvaluatorAnd true');
        evald = scope.get('evaluate')(`(and (eq 1 2) (eq 2 2))`);
        assert(evald === false, 'testEvaluatorAnd false');
    }
    function testEvaluatorOr() {
        var scope = crown();
        var evald;
        evald = scope.get('evaluate')(`(or (eq 1 2) (eq 2 2))`);
        assert(evald === true, 'testEvaluatorOr true');
        evald = scope.get('evaluate')(`(or (eq 1 2) (eq 3 2))`);
        assert(evald === false, 'testEvaluatorOr false');
    }
    function testEvaluatorIf() {
        var scope = crown();
        var evald;
        evald = scope.get('evaluate')(`(if (eq 2 2) (* 2 2) (* 1 1))`);
        assert(evald === 4, 'testEvaluatorIf true');
        evald = scope.get('evaluate')(`(if (eq 1 2) (* 2 2) (* 1 1))`);
        assert(evald === 1, 'testEvaluatorIf false');
    }
    function testEvaluatorCond() {
        var scope = crown();
        var evald;
        evald = scope.get('evaluate')(`(cond ((eq 2 2) (* 2 2)) ((eq 3 3) (* 3 3)))`);
        assert(evald === 4, 'testEvaluatorCond true');
    }
    function testEvaluatorTryCatchThrow() {
        var scope = crown();
        var evald;
        evald = scope.get('evaluate')(`(try (throw 9) 9)`);
        assert(evald === 9, 'testEvaluatorTryCatchThrow caught exception');
    }
    function testEvaluatorSetGet() {
        var scope = crown();
        var evald;
        evald = scope.get('evaluate')(`(set name 200)`);
        assert(evald === 200, 'testEvaluatorSetGet set symbol value');
        evald = scope.get('evaluate')(`name`);
        assert(evald === 200, 'testEvaluatorSetGet get symbol value');
        scope.set('o', { a: { b: 3 } });
        evald = scope.get('evaluate')(`(set o.a 200)`);
        assert(evald === 200, 'testEvaluatorSetGet get set sub property');
        evald = scope.get('evaluate')(`o.a`);
        assert(evald === 200, 'testEvaluatorSetGet get set sub property');
        scope.set('link', Symbol('link'));
        evald = scope.get('evaluate')('link');
        assert(typeof evald === 'symbol', 'testEvaluatorSetGet recursive symbol link');
        assert(evald.description === 'link', 'testEvaluatorSetGet recursive symbol link');
    }
    function testEvaluatorLambda() {
        var scope = crown();
        var evald;
        evald = scope.get('evaluate')(`(lambda (a b c) (* a b c))`);
        assert(typeof evald === 'function', 'testEvaluatorLambda is a function');
        evald = scope.get('evaluate')(`(let ((fn (lambda () (* 1 1)))) (fn))`);
        assert(evald === 1, 'testEvaluatorLambda no args body');
        evald = scope.get('evaluate')(`(let ((fn (lambda () 1))) (fn))`);
        assert(evald === 1, 'testEvaluatorLambda atom body');
        evald = scope.get('evaluate')(`(let ((fn (lambda () ))) (fn))`);
        assert(!evald, 'testEvaluatorLambda no body');
        evald = scope.get('evaluate')(`((lambda (n)(* n 2)) 2)`);
        assert(evald === 4, 'testEvaluatorLambda in function position in list result');
        evald = scope.get('evaluate')(`((lambda (&rest args)\`(* ,@args)) 2 3 4)`);
        assert(typeof evald[0] === 'symbol', 'testEvaluatorLambda &rest');
        assert(evald[0].description === '*', 'testEvaluatorLambda &rest');
        assert(evald[1] === 2, 'testEvaluatorLambda &rest');
        assert(evald[2] === 3, 'testEvaluatorLambda &rest');
        assert(evald[3] === 4, 'testEvaluatorLambda &rest');
    }
    function testEvaluatorMacro() {
        var scope = crown();
        var evald;
        evald = scope.get('evaluate')(`(macro (a b c) (* a b c))`);
        assert(typeof evald === 'function', 'testEvaluatorMacro is a macro');
        assert(evald.macro === true, 'testEvaluatorMacro is a macro');
        evald = scope.get('evaluate')(`(let ((one (macro (a b c) \`(* ,a ,b ,c 8)))
                                           (two (macro (a b c) (one a b c))))
                                        (two 3 4 5))`);
        assert(typeof evald[0] === 'symbol', 'testEvaluatorMacro submacro symbol *');
        assert(evald[0].description === '*', 'testEvaluatorMacro submacro symbol value *');
        assert(evald[1] === 3, 'testEvaluatorMacro submacro call output');
        assert(evald[2] === 4, 'testEvaluatorMacro submacro call output');
        assert(evald[3] === 5, 'testEvaluatorMacro submacro call output');
        assert(evald[4] === 8, 'testEvaluatorMacro submacro call output');
        // do we continue macro expansion? probably. to do
        evald = scope.get('evaluate')(`(let ((m (macro () 1))) (m))`);
        assert(evald === 1, 'testEvaluatorMacro atom body');
        evald = scope.get('evaluate')(`(let ((m (macro () ))) (m))`);
        assert(!evald, 'testEvaluatorMacro no body');
        evald = scope.get('evaluate')(`((macro (n) \`(* ,n 2)) 4)`);
        assert(typeof evald[0] === 'symbol', 'testEvaluatorMacro submacro symbol *');
        assert(evald[0].description === '*', 'testEvaluatorMacro submacro symbol value *');
        assert(evald[1] === 4, 'testEvaluatorMacro function position is num');
        assert(evald[2] === 2, 'testEvaluatorMacro function position is num');
    }
    function testEvaluatorLet() {
        var scope = crown();
        var evald;
        evald = scope.get('evaluate')(`(let ((a 2) (b 3) (c a)) (* 9 9) (* a b c))`);
        assert(evald === 12, 'testEvaluatorLet return body result');
        evald = scope.get('evaluate')(`(let () (* 9 2))`);
        assert(evald === 18, 'testEvaluatorLet empty labels');
        evald = scope.get('evaluate')(`(let 
  ((a 100))
    (* a 3))
  `);
        assert(evald === 300, 'testEvaluatorLet let form');
    }
    function testEvaluatorQuote() {
        var scope = crown();
        var evald;
        evald = scope.get('evaluate')(`'(1 2 3)`);
        assert(evald[0] === 1, 'testEvaluatorQuote output matches input');
        assert(evald[1] === 2, 'testEvaluatorQuote output matches input');
        assert(evald[2] === 3, 'testEvaluatorQuote output matches input');
    }
    function testEvaluatorBackquote() {
        var scope = crown();
        var evald;
        evald = scope.get('evaluate')(`\`(1 2 3))`);
        assert(evald[0] === 1, 'testEvaluatorBackquote output matches input');
        assert(evald[1] === 2, 'testEvaluatorBackquote output matches input');
        assert(evald[2] === 3, 'testEvaluatorBackquote output matches input');
        evald = scope.get('evaluate')(`(let ((a 3)) \`(,a ,a ,a))`);
        assert(evald[0] === 3, 'testEvaluatorBackquote comma output matches input');
        assert(evald[1] === 3, 'testEvaluatorBackquote comma output matches input');
        assert(evald[2] === 3, 'testEvaluatorBackquote comma output matches input');
        evald = scope.get('evaluate')(`(let ((a 3)(b '(1 2 3))) \`(,a ,a ,a ,@b))`);
        assert(evald[0] === 3, 'testEvaluatorBackquote comma splice output matches input');
        assert(evald[1] === 3, 'testEvaluatorBackquote comma splice output matches input');
        assert(evald[2] === 3, 'testEvaluatorBackquote comma splice output matches input');
        assert(evald[3] === 1, 'testEvaluatorBackquote comma splice output matches input');
        assert(evald[4] === 2, 'testEvaluatorBackquote comma splice output matches input');
        assert(evald[5] === 3, 'testEvaluatorBackquote comma splice output matches input');
        evald = scope.get('evaluate')(`(let ((a 3)(b '(1 2 3))) \`(,a ,a ,a ,@(b.map (lambda (x) (+ x 5))))`);
        assert(evald[0] === 3, 'testEvaluatorBackquote comma splice output matches input');
        assert(evald[1] === 3, 'testEvaluatorBackquote comma splice list.map output matches input');
        assert(evald[2] === 3, 'testEvaluatorBackquote comma splice list.map output matches input');
        assert(evald[3] === 6, 'testEvaluatorBackquote comma splice list.map output matches input');
        assert(evald[4] === 7, 'testEvaluatorBackquote comma splice list.map output matches input');
        assert(evald[5] === 8, 'testEvaluatorBackquote comma splice list.map output matches input');
        evald = scope.get('evaluate')(`(let ((a 3)(b '(1 2 3))) \`(,a ,a ,a ,@(b.map (lambda (x) \`(+ ,x 5))))`);
        assert(Array.isArray(evald), 'testEvaluatorBackquote nested backquote matches input is list');
        assert(evald[0] === 3, 'testEvaluatorBackquote nested backquote matches input');
        assert(evald[1] === 3, 'testEvaluatorBackquote nested backquote output matches input');
        assert(evald[2] === 3, 'testEvaluatorBackquote nested backquote output matches input');
        assert(Array.isArray(evald[3]), 'testEvaluatorBackquote nested backquote output matches input');
        assert(typeof evald[3][0] === 'symbol', 'testEvaluatorBackquote nested backquote output matches input');
        assert(evald[3][0].description === '+', 'testEvaluatorBackquote nested backquote output matches input');
        assert(evald[3][1] === 1, 'testEvaluatorBackquote nested backquote output matches input');
        assert(evald[3][2] === 5, 'testEvaluatorBackquote nested backquote output matches input');
        assert(Array.isArray(evald[4]), 'testEvaluatorBackquote nested backquote output matches input');
        assert(typeof evald[4][0] === 'symbol', 'testEvaluatorBackquote nested backquote output matches input');
        assert(evald[4][0].description === '+', 'testEvaluatorBackquote nested backquote output matches input');
        assert(evald[4][1] === 2, 'testEvaluatorBackquote nested backquote output matches input');
        assert(evald[4][2] === 5, 'testEvaluatorBackquote nested backquote output matches input');
        assert(Array.isArray(evald[5]), 'testEvaluatorBackquote nested backquote output matches input');
        assert(typeof evald[5][0] === 'symbol', 'testEvaluatorBackquote nested backquote output matches input');
        assert(evald[5][0].description === '+', 'testEvaluatorBackquote nested backquote output matches input');
        assert(evald[5][1] === 3, 'testEvaluatorBackquote nested backquote output matches input');
        assert(evald[5][2] === 5, 'testEvaluatorBackquote nested backquote output matches input');
        evald = scope.get('evaluate')(`(let ((a 3)) \`(,a ,(* a 4)))`);
        assert(Array.isArray(evald), 'testEvaluatorBackquote nested reference let variable');
        assert(evald[0] === 3, 'testEvaluatorBackquote nested reference let variable');
        assert(evald[1] === 12, 'testEvaluatorBackquote nested reference let variable');
        evald = scope.get('evaluate')(`(let ((m (macro (n) \`(,(+ n "test"))))) (m "james"))`);
        assert(Array.isArray(evald), 'testEvaluatorBackquote macro nested reference let variable');
        assert(evald[0] === 'jamestest', 'testEvaluatorBackquote macro nested reference let variable');
        evald = scope.get('evaluate')(`(let ((m (macro (n) \`(let ((a 1)) \`(+ ,,a ,n))))) (m 100))`);
        assert(Array.isArray(evald[2][1][1]), 'testEvaluatorBackquote macro nested backquote comma');
        assert(typeof evald[2][1][1][1] === 'symbol', 'testEvaluatorBackquote macro nested backquote comma');
        assert(evald[2][1][1][1].description === 'a', 'testEvaluatorBackquote macro nested backquote comma');
    }
    function testEvaluatorNativeFunctionCall() {
        var scope = crown();
        var evald;
        evald = scope.get('evaluate')(`(let ((a '(1 2 3))) (a.map (lambda (e) (* e 2))))`);
        assert(evald[0] === 2, 'testEvaluatorNativeFunctionCall result');
        assert(evald[1] === 4, 'testEvaluatorNativeFunctionCall result');
        assert(evald[2] === 6, 'testEvaluatorNativeFunctionCall result');
        evald = scope.get('evaluate')(`(let ((a '((1) (2) (3)))) (a.map (lambda (e) (e.map (lambda (x)(* x x))))))`);
        assert(Array.isArray(evald), 'testEvaluatorNativeFunctionCall sub call is list');
        assert(evald[0][0] === 1, 'testEvaluatorNativeFunctionCall sub call result');
        assert(evald[1][0] === 4, 'testEvaluatorNativeFunctionCall sub call result');
        assert(evald[2][0] === 9, 'testEvaluatorNativeFunctionCall sub call result');
        evald = scope.get('evaluate')(`(let ((a '(1 2 3))) (((lambda (e) a)).map (lambda (t)(* t 2))))`);
        assert(Array.isArray(evald), 'testEvaluatorNativeFunctionCall function chaining');
        assert(evald[0] === 2, 'testEvaluatorNativeFunctionCall function chaining');
        assert(evald[1] === 4, 'testEvaluatorNativeFunctionCall function chaining');
        assert(evald[2] === 6, 'testEvaluatorNativeFunctionCall function chaining');
    }
    function testEvaluator() {
        testEvaluatorTypes();
        testEvaluatorSymbol();
        testEvaluatorString();
        testEvaluatorObject();
        testEvaluatorAddition();
        testEvaluatorSubtraction();
        testEvaluatorMultiplication();
        testEvaluatorDivision();
        testEvaluatorModulo();
        testEvaluatorEq();
        testEvaluatorNeq();
        testEvaluatorGt();
        testEvaluatorLt();
        testEvaluatorAnd();
        testEvaluatorOr();
        testEvaluatorIf();
        testEvaluatorCond();
        testEvaluatorTryCatchThrow();
        testEvaluatorSetGet();
        testEvaluatorLambda();
        testEvaluatorMacro();
        testEvaluatorLet();
        testEvaluatorQuote();
        testEvaluatorBackquote();
        testEvaluatorNativeFunctionCall();
    }
    function testCompilerTypes() {
        var scope = crown();
        var compiled;
        compiled = scope.get('compile')(`"string"`);
        assert(eval(compiled) === 'string', 'testCompilerTypes string');
        compiled = scope.get('compile')(`true`);
        assert(eval(compiled) === true, 'testCompilerTypes boolean true');
        compiled = scope.get('compile')(`false`);
        assert(eval(compiled) === false, 'testCompilerTypes boolean false');
        compiled = scope.get('compile')(`100`);
        assert(eval(compiled) === 100, 'testCompilerTypes number int');
        compiled = scope.get('compile')(`100.1`);
        assert(eval(compiled) === 100.1, 'testCompilerTypes number float');
        compiled = scope.get('compile')(`symbol`);
        assert(compiled === 'symbol', 'testCompilerTypes symbol');
        compiled = scope.get('compile')(`symbol.0.sub.property`);
        assert(compiled === 'symbol.0.sub.property', 'testCompilerTypes symbol property');
        compiled = scope.get('compile')(`()`);
        assert(compiled === '[]', 'testCompilerTypes empty list');
    }
    function testCompilerSymbol() {
        var scope = crown();
        var compiled;
        compiled = scope.get('compile')(`(symbol "a" "." "b")`);
        console.log(compiled);
    }
    function testCompilerString() {
        var scope = crown();
        var compiled;
        compiled = scope.get('compile')(`(string symbol)`);
        console.log(compiled);
    }
    function testCompilerObject() {
        var scope = crown();
        var compiled;
        compiled = scope.get('compile')(`(object ((a (object ((b 2))))))`);
        console.log(compiled);
    }
    function testCompilerSet() {
        var scope = crown();
        var compiled;
        var evald;
        compiled = scope.get('compile')(`(set a 1)`);
        console.log(compiled);
    }
    function testCompilerAddition() {
        var scope = crown();
        var compiled;
        compiled = scope.get('compile')(`(+ 1 2 3)`);
        console.log(compiled);
    }
    function testCompilerSubtraction() {
        var scope = crown();
        var compiled;
        compiled = scope.get('compile')(`(- 12 3)`);
        console.log(compiled);
    }
    function testCompilerDivision() {
        var scope = crown();
        var compiled;
        compiled = scope.get('compile')(`(/ 12 3)`);
        console.log(compiled);
    }
    function testCompilerMultiplication() {
        var scope = crown();
        var compiled;
        compiled = scope.get('compile')(`(- 12 3)`);
        console.log(compiled);
    }
    function testCompilerModulo() {
        var scope = crown();
        var compiled;
        compiled = scope.get('compile')(`(% 5 2)`);
        console.log(compiled);
    }
    function testCompilerAnd() {
        var scope = crown();
        var compiled;
        compiled = scope.get('compile')(`(and (eq 5 2)(eq 1 1))`);
        console.log(compiled);
    }
    function testCompilerOr() {
        var scope = crown();
        var compiled;
        compiled = scope.get('compile')(`(or (eq 5 2)(eq 1 1))`);
        console.log(compiled);
    }
    function testCompilerEq() {
        var scope = crown();
        var compiled;
        compiled = scope.get('compile')(`(eq 5 2)`);
        console.log(compiled);
    }
    function testCompilerNeq() {
        var scope = crown();
        var compiled;
        compiled = scope.get('compile')(`(neq 5 2)`);
        console.log(compiled);
    }
    function testCompilerGt() {
        var scope = crown();
        var compiled;
        compiled = scope.get('compile')(`(gt 5 2)`);
        console.log(compiled);
    }
    function testCompilerLt() {
        var scope = crown();
        var compiled;
        compiled = scope.get('compile')(`(lt 5 2)`);
        console.log(compiled);
    }
    function testCompilerIf() {
        var scope = crown();
        var compiled;
        compiled = scope.get('compile')(`(if (lt 5 2) (* 2 3) (* 4 4))`);
        console.log(compiled);
    }
    function testCompilerCond() {
        var scope = crown();
        var compiled;
        compiled = scope.get('compile')(`(cond ((lt 5 2) (* 2 3)) (true (* 4 4))(true (* 4 4))(true (* 4 4)))`);
        console.log(compiled);
    }
    function testCompilerTryCatchThrow() {
        var scope = crown();
        var compiled;
        compiled = scope.get('compile')(`(try (throw 9) 9)`);
        console.log(compiled);
    }
    function testCompilerQuote() {
        var scope = crown();
        var compiled;
        compiled = scope.get('compile')(`'(1 (2 "s") 3)`);
        console.log(compiled);
    }
    function testCompilerBackquote() {
        var scope = crown();
        var compiled;
        compiled = scope.get('compile')(`\`(1 (2 "s") 3)`);
        console.log(compiled);
        compiled = scope.get('compile')(`(let ((a '(1 2 3)))\`(1 (2 "s") 3 ,@a))`);
        console.log(compiled);
    }
    function testCompilerLambda() {
        var scope = crown();
        var compiled;
        compiled = scope.get('compile')(`(lambda (a b c) (* a b c))`);
        console.log(compiled);
        compiled = scope.get('compile')(`((lambda (&rest args)\`(* ,@args)) 2 3 4)`);
        console.log(compiled);
    }
    function testCompilerMacro() {
        ;
    }
    function testCompilerLet() {
        var scope = crown();
        var compiled;
        compiled = scope.get('compile')(
            `(let ((a "s")(b 3)(fn (lambda (x)(* x 8)))) (fn 4)(+ a "s")(* 2 2))`);
        console.log(compiled);
        compiled = scope.get('compile')(
            `(let ((a "s")(b 3)(m (macro (x)(* ,x 8)))) (m 4)(+ a "s")(* 2 2))`);
        console.log(compiled);
        compiled = scope.get('compile')(
            `(let ((a "s")(b '(3))(m (macro (x)(b.push x)))) (m 4) b)`);
        console.log(compiled);

    }
    function testCompilerNativeFunction() {
        var scope = crown();
        var compiled;
        scope.set('native', { push: Array.prototype.push });
        compiled = scope.get('compile')(
            `(let ((native '(1 2 3)) (fn (lambda (x)(native.push x 8)))) (fn 4))`);
        console.log(compiled);
        compiled = scope.get('compile')(`(let ((a '(1 2 3))) (((lambda (e) a)).map (lambda (t)(* t 2))))`);
        console.log(compiled);
    }
    function testCompiler() {
        testCompilerTypes();
        testCompilerSymbol();
        testCompilerString();
        testCompilerObject();
        testCompilerSet();
        testCompilerAddition();
        testCompilerSubtraction();
        testCompilerDivision();
        testCompilerMultiplication();
        testCompilerModulo();
        testCompilerAnd();
        testCompilerOr();
        testCompilerEq();
        testCompilerNeq();
        testCompilerGt();
        testCompilerLt();
        testCompilerIf();
        testCompilerCond();
        testCompilerTryCatchThrow();
        testCompilerQuote();
        testCompilerBackquote();
        testCompilerLambda();
        testCompilerMacro();
        testCompilerLet();
        testCompilerNativeFunction();
    }
    function testCrown() {
        var scope = crown();
        var r, evald, compiled;
        r = scope.get('read')(`(1 2 (3 (4)) 5)`);
        assert(Array.isArray(r), 'testCrown read');
        assert(r[0] === 1, 'testCrown read');
        assert(r[1] === 2, 'testCrown read');
        assert(Array.isArray(r[2]), 'testCrown read');
        assert(r[2][0] === 3, 'testCrown read');
        assert(Array.isArray(r[2][1]), 'testCrown read');
        assert(r[2][1][0] === 4, 'testCrown read');
        assert(r[3] === 5, 'testCrown read');
        evald = scope.get('evaluate')(`(lambda (x)(* x x))`);
        assert(typeof evald === 'function', 'testCrown evaluate');
        compiled = scope.get('compile')(`(lambda (x)(* x x))`);
        assert(compiled.length, 'testCrown compile');
        assert(typeof scope.get('readers') !== 'string', 'test crown readers');
        scope.get('readers')['$'] = (scope, it) => {
            return ['$'];
        };
        r = scope.get('read')(`$`);
        assert(Array.isArray(r), 'test crown custom reader');
        assert(r[0] === '$', 'test crown custom reader');
        delete scope.get('readers')['$'];
        assert(typeof scope.get('evaluators') !== 'string', 'test crown evaluators');
        scope.get('evaluators').testEvaluator = (scope, sexpr) => {
            return 42;
        };
        evald = scope.get('evaluate')(`(testEvaluator)`);
        assert(evald === 42, 'testCrown custom evaluator');
        assert(typeof scope.get('compilers') !== 'string', 'test crown compilers');
        delete scope.get('evaluators')['testEvaluator'];
        scope.get('compilers').testCompiler = (scope, sexpr, options) => {
            return '3.14';
        };
        compiled = scope.get('compile')(`(testCompiler)`);
        assert(compiled === '3.14', 'testCrown custom compiler');
        delete scope.get('compilers')['testCompiler'];
    }
    testStringIterator();
    testReader();
    testScope();
    testEvaluator();
    testCompiler();
    testCrown();
}

test();