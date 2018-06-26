// const program = global[Symbol.for('membrane.program')];
global[Symbol.for('membrane.runtime')] = {
  $$: require('@membrane/util').$$,
};

let { root } = require('./build/bindings.js');

console.log(root.threads.one.snippet.ref);
console.log(root.threads.one.messages.ref);
console.log(root.threads({id:4}).one().messages.ref);
