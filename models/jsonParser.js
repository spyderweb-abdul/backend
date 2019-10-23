var logger = require('../config/winston');

function parseFormula(obj) {
  if (obj.hasOwnProperty('connective')){
		if (isMacro(obj.connective.code)) {
			return parseMacro(obj)
		} else {
			return parseConnector(obj);
		}
  } else if (obj.hasOwnProperty('term')){
    return obj.term.name;
  } else if (obj.hasOwnProperty('goal')){
    return parseGoal(obj);
  } else {
    throw {error: `Frontend error: The formula type ${obj.code} is not known.`};
  }
}

function parseGoal(obj) {
  return parseFormula(obj.goal.formula);
}

function parseConnector(obj) {
	var formulas = obj.connective.formulas.map(f => parseFormula(f));
  var argsNum = expectedArgs(obj.connective.code);
  if (argsNum < 0 && formulas.length < 2) {
    throw {error: `The sentence ${obj.text} contains the connective ${obj.connective.name} which expectes at least two operands, but ${formulas.length} were given.`}
  }
  if (argsNum >= 0 && formulas.length != argsNum) {
    throw {error: `The sentence ${obj.text} contains the connective ${obj.connective.name} which expectes ${argsNum} operands, but ${formulas.length} were given.`}
  }
  switch (obj.connective.code) {
    case "neg":
      return `(~ ${formulas[0]})`;
    case "or":
      return formulas.slice(1).reduce(function(acc, val) {
        return `(${acc} ; ${val})`
      }, formulas[0]);
    case "and":
      return formulas.slice(1).reduce(function(acc, val) {
        return `(${acc} , ${val})`
      }, formulas[0]);
    case "eq":
      throw "Equality operators are not yet supported!"
    case "defif":
      return `(${formulas[0]} => ${formulas[1]})`;
    case "defonif":
      return `(${formulas[1]} => ${formulas[0]})`;
    case "ob":
      return `(Ob ${formulas[0]})`
    case "pm":
      return `(Pm ${formulas[0]})`
    case "fb":
      return `(Fb ${formulas[0]})`
    case "id":
      return `(Id ${formulas[0]})`
    case "obif":
      return `(${formulas[0]} O> ${formulas[1]})`;
    case "obonif":
      return `(${formulas[1]} O> ${formulas[0]})`;
    case "pmif":
      return `(${formulas[0]} P> ${formulas[1]})`;
    case "pmonif":
      return `(${formulas[1]} P> ${formulas[0]})`;
    case "spmif":
      return `((${formulas[0]} P> ${formulas[1]}), ((~ ${formulas[0]}) O> (~ ${formulas[1]})))`;
    case "spmonif":
      return `((${formulas[1]} P> ${formulas[0]}), ((~ ${formulas[1]}) O> (~ ${formulas[0]})))`;
    case "fbif":
      return `(${formulas[0]} F> ${formulas[1]})`;
    case "fbonif":
      return `(${formulas[1]} F> ${formulas[0]})`;
    case "equiv":
      return `(${formulas[0]} <=> ${formulas[1]})`;
     default:
      throw {error: `Frontend error: Connective ${obj.connective.code} is not known.`};
  }
}

function parseMacro(obj) {
	let formulas =  obj.connective.formulas
  var argsNum = expectedArgs(obj.connective.code);
  if (argsNum < 0 && formulas.length < 2) {
    throw {error: `The sentence ${obj.text} contains the connective ${obj.connective.name} which expectes at least two operands, but ${formulas.length} were given.`}
  }
  if (argsNum >= 0 && formulas.length != argsNum) {
    throw {error: `The sentence ${obj.text} contains the connective ${obj.connective.name} which expectes ${argsNum} operands, but ${formulas.length} were given.`}
  }
  switch (obj.connective.code) {
    case "obmacro1":
			/*
				This macro simulates obif but accepts a multi obligation rhs (as a conjunction).
				The first element in the conjuct is the term to place in the obligation (containing the VAR value)
				It creates one obligation for each other conjunct on the rhs while replacing the macro VAR in the
					first element with the term in the conjunct.
				If the conjuct is not a term but an implication, it addes all the lhs of the implication to the lhs of the obligation.
			*/
			// ensure second argument is a conjunction
			if (!isOfType(formulas[1].connective, "and")) {
				throw {error: `Frontend error: ${obj.connective.name} must have a conjunct on the second argument.Got instead ${formulas[1].connective.code}`};
			}
			// parse conjunction
			//let conj = formulas[1].connective.formulas.map(parseFormula)
			// extract ob rhs from conjunction
			let obform = parseFormula(formulas[1].connective.formulas[0])
			let conj = formulas[1].connective.formulas.slice(1)
			// lhs
			let lhs = formulas[0]
			// define function combining everything for each conjunct in conj
			let combine = function(conjunct) {
				var clhs
				var crhs
				// if conjunct is a implication, obtain lhs and rhs
					console.log(`>>>>>>>${JSON.stringify(conjunct)}`)
				if (conjunct.hasOwnProperty('term')) {
					clhs = parseFormula(lhs)
					crhs = parseFormula(conjunct)
				} else if (isOfType(conjunct.connective, "defif")) {
					// merge the lhs of the conjunct with that of the expression
					let bigand = createAnd(lhs, conjunct.connective.formulas[0])
					console.log(`>>>>>>>${JSON.stringify(bigand)}`)
					// parse bigand
					clhs = parseFormula(bigand)
					crhs = parseFormula(conjunct.connective.formulas[1])
				} else {
					throw {error: `Frontend error: ${obj.connective.name} supports only terms or implications on the right hand side conjunct`};
				}
				// substitute cojunct for VAR in obform
				let obform2 = obform.replace('VAR', crhs)
				// return new obligation
				return `(${clhs} O> ${obform2})`

			}
      return conj.map(combine)
     default:
      throw {error: `Frontend error: Connective ${obj.connective.code} is not known.`};
  }
}

function createAnd(lhs, rhs) {
	return {
			text:"Text cannot be retrieved currently as it is generated by a macro (TODO)",
			connective:
			{
				name:"And",
				description:"___ And ___ [And ___ [...]]",
				code:"and",
				formulas:[ lhs, rhs ]
			}
		}
}

function isOfType(connective, type) {
	return (connective.code == type)
}

function isMacro(code) {
	switch (code) {
		case "obmacro1":
			return true;
		default:
			return false;
	}
}


function extractViolations(obj) {
  if (obj.hasOwnProperty('connective')){
    switch (obj.connective.code) {
      case "and":
        const concat = (x,y) => x.concat(y)
        var ret = obj.connective.formulas.map(x => extractViolations(x)).reduce(concat, [])
        return ret
      case "obif":
        return extractFromObligation(obj.text, obj.connective.formulas[0], obj.connective.formulas[1], true)
      case "obonif":
        return extractFromObligation(obj.text, obj.connective.formulas[1], obj.connective.formulas[0], true)
      case "fbif":
        return extractFromObligation(obj.text, obj.connective.formulas[0], obj.connective.formulas[1], false)
      case "fbonif":
        return extractFromObligation(obj.text, obj.connective.formulas[1], obj.connective.formulas[0], false)
      default:
        return []
    }
  } else {
    return []
  }
}

function extractFromObligation(text, lhs, rhs, obOrProb) {
  var goal = rhs
  if (obOrProb) { // if we are doing an obligation and not a prohibition
    goal =
      {
        "text": `Negation of ${rhs.text}`,
        "connective": {
          "name": "Negation",
          "code": "neg",
          "formulas": [
            rhs
          ]
        }
      }
  }
  return [{
      "text": `Violation of ${text}`,
      "connective": {
        "name": "Definitional Only If",
        "code": "defonif",
        "formulas": [
          {
            "text": "Violating the text",
            "term": {
              "name": "violation"
            }
          },
          {
            "text": text,
            "connective": {
              "name": "And",
              "code": "and",
              "formulas": [
                lhs
                ,
                goal
              ]
            }
          }
        ]
      }
    }]
}

function expectedArgs(conCode) {
  switch (conCode) {
    case "defif":
    case "defonif":
    case "obonif":
    case "obif":
    case "pmonif":
    case "pmif":
    case "fbonif":
    case "fbif":
    case "eq":
    case "equiv":
		case "obmacro1":
      return 2
    case "neg":
    case "ob":
    case "pm":
    case "fb":
    case "id":
    case "neg":
      return 1
    default:
      return -1
  }
}

module.exports  = { "parseFormula": parseFormula, "extractViolations": extractViolations,"arities": expectedArgs };
