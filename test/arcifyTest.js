var _ = require('lodash'),
    assert = require('chai').assert,
    Picture = require('../client/picture'),
    Shape = require('../client/shape'),
    Arc = require('../client/shape/arc'),
    Polyline = require('../client/shape/polyline'),
    arcify = require('../client/suggest/arcify'),
    MockPaper = require('./mockPaper'),
    guid = require('../lib/guid');

describe('Arcify suggestor', function () {
  var paper = MockPaper(10, 10), picture = new Picture(paper);

  it('should arcify a small arc with positive sweep', function () {
    var line = paper.polyline([0, 0, 1, 1, 2, 1, 3, 0]).attr('id', guid());
    var action = arcify(picture, { results : [line] });
    assert.isOk(action);
    assert.isAtLeast(action.confidence, 0.7);
    var arc = Shape.of(_.last(action.do(picture)));
    assert.instanceOf(arc, Arc);
    assert.equal(arc.path[1].curve.rx, 1.625);
    assert.equal(arc.path[1].curve.ry, 1.625);
    assert.isNotOk(arc.path[1].curve.sweepFlag);
    assert.isNotOk(arc.path[1].curve.largeArcFlag);
  });

  it('should arcify a small arc with negative sweep', function () {
    var line = paper.polyline([0, 1, 1, 0, 2, 0, 3, 1]).attr('id', guid());
    var action = arcify(picture, { results : [line] });
    assert.isOk(action);
    assert.isAtLeast(action.confidence, 0.7);
    var arc = Shape.of(_.last(action.do(picture)));
    assert.instanceOf(arc, Arc);
    assert.equal(arc.path[1].curve.rx, 1.625);
    assert.equal(arc.path[1].curve.ry, 1.625);
    assert.isOk(arc.path[1].curve.sweepFlag);
    assert.isNotOk(arc.path[1].curve.largeArcFlag);
  });

  it('should arcify a large arc with positive sweep', function () {
    // Octagon under x-axis with topmost side missing, c = [1.5, 1.5]
    var line = paper.polyline([1, 0, 0, 1, 0, 2, 1, 3, 2, 3, 3, 2, 3, 1, 2, 0]).attr('id', guid());
    var action = arcify(picture, { results : [line] });
    assert.isOk(action);
    assert.isAtLeast(action.confidence, 0.8);
    var arc = Shape.of(_.last(action.do(picture)));
    assert.instanceOf(arc, Arc);
    assert.isAtLeast(arc.path[1].curve.rx, 1.5);
    assert.isAtMost(arc.path[1].curve.rx, 1.6);
    assert.isAtLeast(arc.path[1].curve.ry, 1.5);
    assert.isAtMost(arc.path[1].curve.rx, 1.6);
    assert.isNotOk(arc.path[1].curve.sweepFlag);
    assert.isOk(arc.path[1].curve.largeArcFlag);
  });
});
