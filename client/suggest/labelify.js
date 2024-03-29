var _ = require('lodash')
    Point = require('kld-affine').Point2D,
    Shape = require('../shape'),
    Label = require('../shape/label'),
    Mutation = require('../action/mutation');

module.exports = function suggestLabel(picture, lastAction) {
  var e1 = _.last(lastAction.results);
  if (e1 && !Shape.elementRemoved(e1) && !e1.hasClass('label')) {
    // TODO: Improve performance by using picture.elements(bbox)
    return _.last(_.sortBy(_.reduce(picture.elements(':not(.label)'), function (candidates, e2) {
      var classified = _.partition([e1, e2], function (e) {
        return Shape.elementName(e) === 'text';
      }), label = _.first(classified[0]), on = _.first(classified[1]);
      if (label && on) {
        // If the label is wholly within the labelee, we are 90% sure
        var ls = Shape.of(label), les = Shape.of(on), factor = les.contains(ls) ? 10 : 1;
        return candidates.concat(new Mutation(ls, ls.clone({
          class : 'label',
          // Don't set the ox and oy, so the user sees the suggestion happening
          // Some kind of animation be cool in future
          on : on.attr('id'),
          // If the labellee is a line, offset by one unit in the line's unit coordinates
          oy : les.name === 'line' ? new Point(0, 1).transform(les.scale(les.rotation()).inverse()).y : 0
        }), {
          confidence : 1 - (ls.getBBox().c.distanceFrom(les.getBBox().c) / (les.getExtent() * factor))
        }));
      }
      return candidates;
    }, []), 'confidence'));
  }
}
