var _ = require('lodash'),
    Action = require('../action'),
    Shape = require('../shape');

function Mutation(from, to, options) {
  Action.call(this, options);
  this.from = from;
  this.to = to;
}

Mutation.fromJSON = function (data) {
  return data.type === 'mutation' &&
    new Mutation(Shape.fromJSON(data.from), Shape.fromJSON(data.to), data);
};

Mutation.prototype = Object.create(Action.prototype);
Mutation.prototype.constructor = Mutation;

Mutation.prototype.do = function (picture) {
  return this.to.applyTo(picture.getElement(this.from.id));
};

Mutation.prototype.isOK = function (picture) {
  element = picture.getElement(this.from.id);
  return element && _.every(picture.outLinks(element));
};

Mutation.prototype.un = function () {
  return new Mutation(this.to, this.from, { undoOf : this.id });
};

Mutation.prototype.preview = function (picture, paper) {
  return picture.preview(paper, this.to);
};

Mutation.prototype.toJSON = function () {
  return _.assign(Action.prototype.toJSON.call(this), {
    type : 'mutation', from : this.from.toJSON(), to : this.to.toJSON()
  });
};

module.exports = Mutation;
