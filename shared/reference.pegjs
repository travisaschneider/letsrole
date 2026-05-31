{

    function createString(string) {
        return {
            type: 'string',
            value: string,
            total: 1,
            children: []
        };
    }

    function canBeString(value) {
        if (value.type === 'string') {
            return true;
        }

        if (value.type === 'reference' || value.type === 'variable') {
            if (value.value) {
                return true;
            }
        }

        return false;
    }

    function createContextValue(id) {
        let value = options.getContextValue(id);

        if (typeof value === 'string') {
            return createString(value);
        }

        return createNumber(value, []);
    }

    function createReference(reference) {
        let total = options.getReferenceValue(reference);
        let value = null;

        if (typeof total === 'string') {
            value = total;
        }

        return {
            reference: reference,
            type: 'reference',
            total: total,
            value: value,
            children: []
        };
    }

    function createVariable(variable) {
        let total = options.getVariableValue(variable);

        return {
            variable: variable,
            type: 'variable',
            total: total,
            children: []
        };
    }

    function createNumber(total, children) {
        if (!children) children = [];
        if (!Array.isArray(children)) children = [children];

        if (total === null || total === undefined) {
            total = 0;
        }

        return {
            type: 'number',
            total: total,
            children: children
        };
    }

    function createComparison(type, left, right) {
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

        let result = compare(left.total, right.total);
        let inc = 1;

        if (result) {
            success += inc;
        } else {
            failure += inc;
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
        };
    }
}

start
    = comparison

comparison
    = left:additive _ operation:(">=" / "<=" / ">" / "<" / "=" / "!=") _ right:additive
    {
        return createComparison(operation, left, right);
    }
    / additive

additive
    = left:multiplicative _ operation:("+" / "-") _ right:additive
    {
        if (operation === '+') {
            if (canBeString(left) && canBeString(right)) {
                return createString(left.value + right.value);
            }

            if (canBeString(left) && !canBeString(right)) {
                if (right.total === null) {
                    return createString(left.value);
                }

                return createString(left.value + right.total.toString(10));
            }

            if (!canBeString(left) && canBeString(right)) {
                if (left.total === null) {
                    return createString(right.value);
                }

                return createString(left.total.toString(10) + right.value);
            }

            return createNumber(left.total + right.total, [left, right]);
        } else {
            return createNumber(left.total - right.total, [left, right]);
        }
    }
    / multiplicative

multiplicative
    = left:reference _ operation:("*" / "/" / "%") _ right:multiplicative
    {
        if (operation === '*') {
            return createNumber(left.total * right.total, [left, right]);
        } else if (operation === '/') {
            return createNumber(left.total / right.total, [left, right]);
        } else {
            return createNumber(left.total % right.total, [left, right]);
        }
    }
    / reference

reference
    = "@" reference:word
    {
        return createReference(reference.join(""));
    }
    / variable

variable
    = "$" reference:word
    {
        return createVariable(reference.join(""));
    }
    / context

context
    = "#" reference:word
    {
        return createContextValue(reference.join(""));
    }
    / functions

functions
    = fct_round / fct_floor / fct_ceil / fct_avg / fct_sum / fct_if
    / primary

primary
    = number
    / "(" _ comparison:comparison _ ")"
    {
        return createNumber(comparison.total, [comparison]);
    }

number "number"
    = digits:("-"? [0-9]+) separator:"."* decimal:([0-9]+)*
    {
        let after = '';
        let neg = false;

        if (decimal.length) {
            after = decimal[0].join("");
        }

        if (digits[0] === '-') {
            neg = true;
        }

        var number = parseFloat(digits[1].join("") + "." + after);

        if (neg) {
            number = -number;
        }

        return createNumber(number, null);
    }
    / string

string "string"
    = '"' chars:words '"' {
        return createString(chars.join(""));
    }

fct_round
    = "round" "(" value:comparison ")"
    {
        return createNumber(Math.round(value.total), value);
    }

fct_floor
    = "floor" "(" value:comparison ")"
    {
        return createNumber(Math.floor(value.total), value);
    }

fct_ceil
    = "ceil" "(" value:comparison ")"
    {
        return createNumber(Math.ceil(value.total), value);
    }

fct_avg
    = "avg" "(" base:additive _ args:("," _ additive _)* ")"
    {
        let items = [];
        let totals = [];

        items.push(base);
        totals.push(base.total);

        for (let i in args) {
            for (let j in args[i]) {
                if (args[i][j].total) {
                    items.push(args[i][j]);
                    totals.push(args[i][j].total);
                }
            }
        }

        let sum = totals.reduce(function(pv, cv) { return pv + cv; }, 0);
        let avg = sum / (totals.length);

        return createNumber(avg, items);
    }

fct_sum
    = "sum" "(" base:additive _ args:("," _ additive _)* ")"
    {
        let items = [];
        let totals = [];

        items.push(base);
        totals.push(base.total);

        for (let i in args) {
            for (let j in args[i]) {
                if (args[i][j].total) {
                    items.push(args[i][j]);
                    totals.push(args[i][j].total);
                }
            }
        }

        let sum = totals.reduce(function(pv, cv) { return pv + cv; }, 0);

        return createNumber(sum, items);
    }

fct_if
    = "if" "(" base:comparison _ "," _ result:additive _ ","? _ otherwise:additive? _ ")"
    {
        if (canBeString(base) && base.value != null) {
            return result;
        }

        if (base.total > 0) {
            return result;
        } else {
            if (otherwise) {
                return otherwise;
            }
        }

        return createNumber(0, []);
    }

charlist
    = val:char+ sep:","* _

char
    = [A-Za-z_]

word
    = [0-9A-Za-z_]*

words
    = [^"]*

_ "whitespace"
    = [ ]*
