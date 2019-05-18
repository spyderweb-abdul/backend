var assert = require('assert')
const fs = require('fs');

var parser = require('../models/jsonParser')

let json_rome = fs.readFileSync("./test/fixtures/rome1.json", "utf8");

const pairs = [
  [json_rome, '(validChoice(Law,Part) O> contract(Law,Part))']
];

describe("JSON parser", function(){
  it(`should parse the objects in ${pairs} correctly`, function(done){
    for(var i = 0 ; i < pairs.length; i++) {
      assert.equal(parser.parseFormula(JSON.parse(pairs[i][0])), pairs[i][1]);
    }
    done();
  });
})

