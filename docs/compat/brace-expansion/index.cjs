const modern = require("brace-expansion-modern");

const expand = (...args) => modern.expand(...args);

module.exports = Object.assign(expand, modern);
module.exports.expand = modern.expand;
