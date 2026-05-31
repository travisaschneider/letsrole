{
    const MAX_DICE_ROLL = 500;

    function createNumber(total, tags, children) {
        if (!tags) tags = null;
        if (!children) children = [];
        if (!Array.isArray(children)) children = [children];

        return {
            type: 'number',
            total: total,
            tags: tags,
            children: children
        }
    }

    function discardValues(value) {
        if (value.type === 'dice') {
            value.discarded = value.values;
            value.values = [];
        }

        value.children.forEach((child) => {
            discardValues(child);
        });
    }

    function computeTotal(value) {
        if (value.type === 'dice') {
            value.total = value.values.reduce((accumulator, currentValue) => accumulator + currentValue);
        } else if (value.type === 'number' && value.children && value.children.length) {
            let total = 0;

            for (let i in value.children) {
                total += computeTotal(value.children[i]);
            }

            value.total = total;
        }

        return value.total;
    }

    function multiply(value, multiplier) {
        if (value.type === 'dice') {
            for (let i = 0; i < value.size * (multiplier - 1); i++) {
                let newValue = randInt(1, value.dimension);
                value.values.push(newValue);
                incrementDice();
            }

            value.size *= multiplier;
        }

        if (Array.isArray(value.children)) {
            value.children.forEach((child) => {
                multiply(child, multiplier);
            });
        }

        computeTotal(value);
    }

    function filter(type, value, size) {
        if (value.type !== 'dice') {
            return value;
        }

        let results;

        const sortNum = (a, b) => {
            return a - b;
        };

        switch (type) {
            case 'keeph' :
            case 'remh' :
            case 'adv' :
                results = value.values.sort(sortNum).reverse();
                break;
            case 'keepl' :
            case 'reml' :
            case 'disadv' :
                results = value.values.sort(sortNum);
                break;
        }

        value.values = [];

        let position = 0;

        for (let i in results) {
            if (type === 'keeph' || type === 'keepl' || type === 'adv' || type === 'disadv') {
                if (position < size.total) {
                    value.values.push(results[i]);
                } else {
                    value.discarded.push(results[i]);
                }
            } else if (type === 'remh' || type === 'reml') {
                if (position < size.total) {
                    value.discarded.push(results[i]);
                } else {
                    value.values.push(results[i]);
                }
            }

            position++;
        }

        value.values = shuffle(value.values);
        value.discarded = shuffle(value.discarded);

        computeTotal(value);

        return value;
    }

    function shuffle(a) {
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function createComparison(type, left, right, more) {
        let children = [];

        const compare = (from, to) => {
            switch (type) {
                case '>' : return from > to; break;
                case '<' : return from < to; break;
                case '<=' : return from <= to; break;
                case '>=' : return from >= to; break;
                case '=' : return from == to; break;
                case '!=' : return from != to; break;
            }
        };

        let success = 0;
        let failure = 0;

        if (left.type === 'number') {
            if (right.type === 'number') {
                let result = compare(left.total, right.total);
                let inc = 1;

                if (more !== null && more[left.total] !== undefined) {
                    inc = more[left.total];
                }

                if (result) {
                    success += inc;
                } else {
                    failure += inc;
                }
            } else if (right.type === 'dice') {
                for (let i in right.values) {
                    let result = compare(left.total, right.values[i]);
                    let inc = 1;

                    if (more !== null && more[left.total] !== undefined) {
                        inc = more[left.total];
                    }

                    if (result) {
                        success += inc;
                    } else {
                        failure += inc;
                    }
                }
            }
        } else if (left.type === 'dice') {
            for (let i in left.values) {
                let result = compare(left.values[i], right.total);
                let inc = 1;

                if (more !== null && more[left.values[i]] !== undefined) {
                    inc = more[left.values[i]];
                }

                if (result) {
                    success += inc;
                } else {
                    failure += inc;
                }
            }
        }

        children.push(left, right);

        return {
            type: 'comparison',
            left: left,
            right: right,
            success: success,
            total: success,
            failure: failure,
            children: children
        }
    }

    function createDice(size, dimension, tags, children) {
        if (!tags) tags = null;
        if (!children) children = [];

        size = Math.round(size);
        dimension = Math.round(dimension);

        let values = [];
        let total = 0;

        for (let i = 0; i < size; i++) {
            let value = randInt(1, dimension);
            values.push(value);
            total += value;
            incrementDice();
        }

        return {
            type: 'dice',
            values: values,
            discarded: [],
            total: total,
            size: size,
            dimension: dimension,
            tags: tags,
            children: children
        }
    }

    function incrementDice() {
        options.context.rolled++;

        if (options.context.rolled > MAX_DICE_ROLL) {
            throw new Error(`Too many dice (max ${MAX_DICE_ROLL})`);
        }
    }

    function randInt(min, max) {
        return options.context.rng(min, max);
    }
}

start
    = ternary

ternary
    = question:comparison _ "?" _ yes:comparison _ ":" _ no:comparison
    {
        return question.total ? yes : no;
    }
    / comparison

comparison
    = left:additive _ operation:(">=" / "<=" / ">" / "<" / "=" / "!=") more:more? _ right:additive
    {
        return createComparison(operation, left, right, more);
    }
    / additive

more
    = values:("{" _ number _ ":" _ number _ ("," _ number _ ":" _ number _)* "}")
    {
        let result = {};

        result[values[2].total] = values[6].total;

        if (values[8]) {
            values[8].forEach((val) => {
                result[val[2].total] = val[6].total;
            });
        }

        return result;
    }

additive
    = left:multiplicative operation:(_ ("+" / "-") _ multiplicative)*
    {
        return operation.reduce(function(result: any, element: any[]) {
            if (element[1] === "+") { 
                return createNumber(result.total + element[3].total, null, [result, element[3]]);
            }
            if (element[1] === "-") {
                return createNumber(result.total - element[3].total, null, [result, element[3]]);
            }
        }, left);
    }

multiplicative
    = left:dice operation:(_ ("*" / "/" / "%") _ dice)*
    {
        return operation.reduce(function(result: any, element: any[]) {
            if (element[1] === "*") { 
                return createNumber(result.total * element[3].total, null, [result, element[3]]);
            } else if (element[1] === "/") {
                return createNumber(result.total / element[3].total, null, [result, element[3]]);
            } else if (element[1] === "%") {
                return createNumber(result.total % element[3].total, null, [result, element[3]]);
            }
        }, left);
    }

dice
    = left:primary ("d" / "D") right:primary
    {
        let tags = [];

        if (right.tags && right.tags.length) {
            tags = right.tags;
            right.tags = null;
        }

        let res = createDice(left.total, right.total, tags, [left, right]);

        return res;
    }
    / functions

functions
    = fct_round / fct_floor / fct_ceil / fct_keep / fct_rem / fct_minmax / fct_expl / fct_mul / fct_reroll
    / primary

primary
    = number
    / "(" _ comparison:ternary _ ")" tags:tag?
    {
        return createNumber(comparison.total, tags, [comparison]);
    }

number "number"
    = digits:("-"? [0-9]+) decimal:(("." [0-9]*)?) tags:tag?
    {
        let after = '';
        if (decimal && decimal.length) {
            after = decimal[1].join("");
        }

        let sign = digits[0] === '-' ? -1 : 1;

        var number = sign * Number(digits[1].join("") + "." + after);

        return createNumber(number, tags, null);
    }

tag "tag"
    = open:"[" list:charlist+ close:"]"
    {
        let tags = [];

        for (let i in list) {
            let tag = list[i][0].join('');
            tags.push(tag);
        }

        return tags;
    }

fct_round
    = "round" "(" value:comparison ")" tags:tag?
    {
        return createNumber(Math.round(value.total), tags, value);
    }

fct_floor
    = "floor" "(" value:comparison ")" tags:tag?
    {
        return createNumber(Math.floor(value.total), tags, value);
    }

fct_ceil
    = "ceil" "(" value:comparison ")" tags:tag?
    {
        return createNumber(Math.ceil(value.total), tags, value);
    }

fct_keep
    = type:("keeph"/"keepl"/"adv"/"disadv") "(" _ value:comparison _ size:("," _ additive _ )? ")" tags:tag?
    {
        if (size && size.length) {
            size = size[2];
        } else {
            size = createNumber(1, null, null);
        }

        let res = filter(type, value, size);
        res.tags = tags;

        return res;
    }

fct_rem
    = type:("remh"/"reml") "(" _ value:comparison _ size:("," _ additive _ )? ")" tags:tag?
    {
        if (size && size.length) {
            size = size[2];
        } else {
            size = createNumber(1, null, null);
        }

        let res = filter(type, value, size);
        res.tags = tags;

        return res;
    }

fct_minmax
    = type:("min"/"max") "(" _ value:comparison _ args:("," _ additive _)* ")" tags:tag?
    {
        let values = [];

        args.forEach((arg) => {
            values.push(arg[2]);
        });

        values.push(value);

        values = values.reverse();

        let choice;
        let index = -1;

        if (type === "min") {
            let min = Number.MAX_SAFE_INTEGER;

            for (let i in values) {
                if (values[i].total < min) {
                    choice = values[i];
                    min = choice.total;
                    index = parseInt(i, 10);
                }
            }
        } else {
            let max = -Number.MAX_SAFE_INTEGER;

            for (let i in values) {
                if (values[i].total > max) {
                    choice = values[i];
                    max = choice.total;
                    index = parseInt(i, 10);
                }
            }
        }

        if (!choice.children) {
            choice.children = [];
        }

        values.splice(index, 1);

        values.forEach((value) => {
            discardValues(value);
            choice.children.push(value);
        });

        if (tags) {
            if (!choice.tags) {
                choice.tags = [];
            }

            tags.forEach((tag) => {
                choice.tags.push(tag);
            });
        }

        return choice;
    }

fct_expl
    = type:("expladdn"/"expladd"/"expln"/"expl") "(" _ dice:dice _ args:("," _ additive _)* ")" tags:tag?
    {
        let values = [];
        // any infinitely exploding dice will raise an error at MAX_DICE_ROLL
        let maxIterations = MAX_DICE_ROLL + 1;

        if (args && args.length) {
            args.forEach((arg) => {
                values.push(arg[2].total);
            });

            if (type === 'expladdn' || type === 'expln') {
                maxIterations = values.pop();
            }
        }

        if (!values.length) {
            values = [dice.dimension];
        }

        let i = 0;
        let generated = {};

        const diceExplCount = {};
        const diceExplRoot = {};
        while (i < dice.values.length) {
            let val = dice.values[i];
            let index = i.toString();

            if (values.indexOf(val) !== -1) {
                if (type === 'expladd' || type === 'expladdn') {
                    let newValue;
                    let cnt = 0;
                    do  {
                        newValue = randInt(1, dice.dimension);
                        incrementDice();
                        dice.values[i] += newValue;
                    } while (++cnt < maxIterations && values.indexOf(newValue) !== -1);
                } else {
                    let root = index;
                    if (diceExplRoot.hasOwnProperty(index)) {
                        root = diceExplRoot[index];
                    } else {
                        diceExplCount[root] = 0;
                    }

                    if (diceExplCount[root] < maxIterations) {
                        diceExplCount[root]++;
                        const newValue = randInt(1, dice.dimension);
                        incrementDice();
                        const newLength = dice.values.push(newValue);
                        diceExplRoot[newLength-1] = root;
                    }
                }
            }

            i++;
        }

        computeTotal(dice);

        return dice;
    }

fct_mul
    = "mul" "(" _ value:comparison _ size:("," _ additive _ ) ")" tags:tag?
    {
        let multiplier = size[2].total;
        multiply(value, multiplier);

        return value;
    }

fct_reroll
    = type:("rerolln"/"reroll") "(" _ dice:comparison _ args:("," _ additive _)* ")" tags:tag?
    {
        if (dice.type !== 'dice') {
            return dice;
        }

        let count = Number.MAX_SAFE_INTEGER;

        if (type === 'rerolln') {
            count = args.pop()[2].total;

            if (args.length === 0) {
                throw new Error('rerolln expects at least two extra arguments (one for which value to roll again, one for the maximum reroll count)');
            }
        } else {
            if (args.length === 0) {
                throw new Error('reroll expects at least one extra argument');
            }
        }

        let values = [];

        args.forEach((arg) => {
            values.push(arg[2].total);
        });

        const reroll = (value, index, depth) => {
            if (depth >= count) {
                return;
            }

            if (values.indexOf(value) !== -1) {
                dice.values.splice(index, 1);

                let newValue = randInt(1, dice.dimension);
                incrementDice();

                dice.discarded.push(value);
                dice.values.splice(index, 0, newValue);

                reroll(newValue, index, depth + 1);
            }
        };

        dice.values.forEach((val, index) => {
            reroll(val, index, 0);
        });

        computeTotal(dice);

        return dice;
    }

charlist
    = val:char+ sep:","* _

char
    = [A-Za-z_]

_ "whitespace"
    = [ ]*