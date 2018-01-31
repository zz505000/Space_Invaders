;(function(exports) {

  // The top-level functions that run the simulation
  // -----------------------------------------------

  // **start()** creates the lines and circles and starts the simulation.
  function start() {

    // In index.html, there is a canvas tag that the game will be drawn in.
    // Grab that canvas out of the DOM.  From it, get the drawing
    // context, an object that contains functions that allow drawing to the canvas.
    var screen = document.getElementById('circles-bouncing-off-lines').getContext('2d');

    // `world` holds the current state of the world.
    var world = {
      circles: [],

      // Set up the five lines.
      lines: [
        makeLine({ x: 100, y: 100 }),
        makeLine({ x: 200, y: 100 }),
        makeLine({ x: 150, y: 150 }),
        makeLine({ x: 100, y: 200 }),
        makeLine({ x: 220, y: 200 }),
      ],

      dimensions: { x: screen.canvas.width, y: screen.canvas.height },

      // `timeLastCircleMade` is used in the periodic creation of new circles.
      timeLastCircleMade: 0
    };

    // **tick()** is the main simulation tick function.  It loops forever, running 60ish times a second.
    function tick() {

      // Update state of circles and lines.
      update(world);

      // Draw circles and lines.
      draw(world, screen);

      // Queue up the next call to tick with the browser.
      requestAnimationFrame(tick);
    };

    // Run the first game tick.  All future calls will be scheduled by
    // `tick()` itself.
    tick();
  };

  // Export `start()` so it can be run by index.html
  exports.start = start;

  // **update()** updates the state of the lines and circles.
  function update(world) {

    // Move and bounce the circles.
    updateCircles(world)

    // Create new circle if one hasn't been created for a while.
    createNewCircleIfDue(world);

    // Rotate the lines.
    updateLines(world);
  };

  // **updateCircles()** moves and bounces the circles.
  function updateCircles(world) {
    for (var i = world.circles.length - 1; i >= 0; i--) {
      var circle = world.circles[i];

      // Run through all lines.
      for (var j = 0; j < world.lines.length; j++) {
        var line = world.lines[j];

        // If `line` is intersecting `circle`, bounce circle off line.
        if (trig.isLineIntersectingCircle(circle, line)) {
          physics.bounceCircle(circle, line);
        }
      }

      // Apply gravity to the velocity of `circle`.
      physics.applyGravity(circle);

      // Move `circle` according to its velocity.
      physics.moveCircle(circle);

      // Remove circles that are off screen.
      if (!isCircleInWorld(circle, world.dimensions)) {
        world.circles.splice(i, 1);
      }
    }
  };

  // **createNewCircleIfDue()** creates a new circle every so often.
  function createNewCircleIfDue(world) {
    var now = new Date().getTime();
    if (now - world.timeLastCircleMade > 400) {
      world.circles.push(makeCircle({ x: world.dimensions.x / 2, y: -5 }));

      // Update last circle creation time.
      world.timeLastCircleMade = now;
    }
  };

  // **updateLines()** rotates the lines.
  function updateLines(world) {
    for (var i = 0; i < world.lines.length; i++) {
      world.lines[i].angle += world.lines[i].rotateSpeed;
    }
  };

  // **draw()** draws the all the circles and lines in the simulation.
  function draw(world, screen) {
    // Clear away the drawing from the previous tick.
    screen.clearRect(0, 0, world.dimensions.x, world.dimensions.y);

    var bodies = world.circles.concat(world.lines);
    for (var i = 0; i < bodies.length; i++) {
      bodies[i].draw(screen);
    }
  };

  // **makeCircle()** creates a circle that has the passed `center`.
  function makeCircle(center) {
    return {
      center: center,
      velocity: { x: 0, y: 0 },
      radius: 5,

      // The circle has its own built-in `draw()` function.  This allows
      // the main `draw()` to just polymorphicly call `draw()` on circles and lines.
      draw: function(screen) {
        screen.beginPath();
        screen.arc(this.center.x, this.center.y, this.radius, 0, Math.PI * 2, true);
        screen.closePath();
        screen.fillStyle = "black";
        screen.fill();
      }
    };
  };

  // **makeLine()** creates a line that has the passed `center`.
  function makeLine(center) {
    return {
      center: center,
      len: 70,

      // Angle of the line in degrees.
      angle: 0,

      rotateSpeed: 0.5,

      // The line has its own built-in `draw()` function.  This allows
      // the main `draw()` to just polymorphicly call `draw()` on circles and lines.
      draw: function(screen) {
        var end1 = trig.lineEndPoints(this)[0];
        var end2 = trig.lineEndPoints(this)[1];

        screen.beginPath();
        screen.lineWidth = 1.5;
        screen.moveTo(end1.x, end1.y);
        screen.lineTo(end2.x, end2.y);
        screen.closePath();

        screen.strokeStyle = "black";
        screen.stroke();
      }
    };
  };

  // **isCircleInWorld()** returns true if `circle` is on screen.
  function isCircleInWorld(circle, worldDimensions) {
    return circle.center.x > -circle.radius &&
      circle.center.x < worldDimensions.x + circle.radius &&
      circle.center.y > -circle.radius &&
      circle.center.y < worldDimensions.y + circle.radius;
  };

  // Trigonometry functions to help with calculating circle movement
  // -------------------------------------------------------------

  var trig = {

    // **distance()** returns the distance between `point1` and `point2`
    // as the crow flies.  Uses Pythagoras's theorem.
    distance: function(point1, point2) {
      var x = point1.x - point2.x;
      var y = point1.y - point2.y;
      return Math.sqrt(x * x + y * y);
    },

    // **magnitude()** returns the magnitude of the passed vector.
    // Sort of like the vector's speed.  A vector with a larger x or y
    // will have a larger magnitude.
    magnitude: function(vector) {
      return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    },

    // **unitVector()** returns the unit vector for `vector`.
    // A unit vector points in the same direction as the original,
    // but has a magnitude of 1.  It's like a direction with a
    // speed that is the same as all other unit vectors.
    unitVector: function(vector) {
      return {
        x: vector.x / trig.magnitude(vector),
        y: vector.y / trig.magnitude(vector)
      };
    },

    // **dotProduct()** returns the dot product of `vector1` and
    // `vector2`. A dot product represents the amount one vector goes
    // in the direction of the other.  Imagine `vector2` runs along
    // the ground and `vector1` represents a ball fired from a
    // cannon. If `vector2` is multiplied by the dot product of the
    // two vectors, it produces a vector that represents the amount
    // of ground covered by the ball.
    dotProduct: function(vector1, vector2) {
      return vector1.x * vector2.x + vector1.y * vector2.y;
    },

    // **vectorBetween()** returns the vector that runs between `startPoint`
    // and `endPoint`.
    vectorBetween: function(startPoint, endPoint) {
      return {
        x: endPoint.x - startPoint.x,
        y: endPoint.y - startPoint.y
      };
    },

    // **lineEndPoints()** returns an array containing the points
    // at each end of `line`.
    lineEndPoints: function(line) {
      var angleRadians = line.angle * 0.01745;

      // Create a unit vector that represents the heading of
      // `line`.
      var lineUnitVector = trig.unitVector({
        x: Math.cos(angleRadians),
        y: Math.sin(angleRadians)
      });

      // Multiply the unit vector by half the line length.  This
      // produces a vector that represents the offset of one of the
      // ends of the line from the center.
      var endOffsetFromCenterVector = {
        x: lineUnitVector.x * line.len / 2,
        y: lineUnitVector.y * line.len / 2
      };

      // Return an array that contains the points at the two `line` ends.
      return [

        // Add the end offset to the center to get one end of 'line'.
        {
          x: line.center.x + endOffsetFromCenterVector.x,
          y: line.center.y + endOffsetFromCenterVector.y
        },

        // Subtract the end offset from the center to get the other
        // end of `line`.
        {
          x: line.center.x - endOffsetFromCenterVector.x,
          y: line.center.y - endOffsetFromCenterVector.y
        }
      ];
    },

    // **pointOnLineClosestToCircle()** returns the point on `line`
    // closest to `circle`.
    pointOnLineClosestToCircle: function(circle, line) {

      // Get the points at each end of `line`.
      var lineEndPoint1 = trig.lineEndPoints(line)[0];
      var lineEndPoint2 = trig.lineEndPoints(line)[1];

      // Create a vector that represents the line
      var lineUnitVector = trig.unitVector(
        trig.vectorBetween(lineEndPoint1, lineEndPoint2));

      // Pick a line end and create a vector that represents the
      // imaginary line between the end and the circle.
      var lineEndToCircleVector = trig.vectorBetween(lineEndPoint1, circle.center);

      // Get a dot product of the vector between the line end and circle, and
      // the line vector.  (See the `dotProduct()` function for a
      // fuller explanation.)  This projects the line end and circle
      // vector along the line vector.  Thus, it represents how far
      // along the line to go from the end to get to the point on the
      // line that is closest to the circle.
      var projection = trig.dotProduct(lineEndToCircleVector, lineUnitVector);

      // If `projection` is less than or equal to 0, the closest point
      // is at or past `lineEndPoint1`.  So, return `lineEndPoint1`.
      if (projection <= 0) {
        return lineEndPoint1;

      // If `projection` is greater than or equal to the length of the
      // line, the closest point is at or past `lineEndPoint2`.  So,
      // return `lineEndPoint2`.
      } else if (projection >= line.len) {
        return lineEndPoint2;

      // The projection indicates a point part way along the line.
      // Return that point.
      } else {
        return {
          x: lineEndPoint1.x + lineUnitVector.x * projection,
          y: lineEndPoint1.y + lineUnitVector.y * projection
        };
      }
    },

    // **isLineIntersectingCircle()** returns true if `line` is
    // intersecting `circle`.
    isLineIntersectingCircle: function(circle, line) {

      // Get point on line closest to circle.
      var closest = trig.pointOnLineClosestToCircle(circle, line);

      // Get the distance between the closest point and the center of
      // the circle.
      var circleToLineDistance = trig.distance(circle.center, closest);

      // Return true if distance is less than the radius.
      return circleToLineDistance < circle.radius;
    }
  }

  // Physics functions for calculating circle movement
  // -----------------------------------------------

  var physics = {

    // **applyGravity()** adds gravity to the velocity of `circle`.
    applyGravity: function(circle) {
      circle.velocity.y += 0.06;
    },

    // **moveCircle()** adds the velocity of the circle to its center.
    moveCircle: function(circle) {
      circle.center.x += circle.velocity.x;
      circle.center.y += circle.velocity.y;
    },

    // **bounceCircle()** assumes `line` is intersecting `circle` and
    // bounces `circle` off `line`.
    bounceCircle: function(circle, line) {

      // Get the vector that points out from the surface the circle is
      // bouncing on.
      var bounceLineNormal = physics.bounceLineNormal(circle, line);

      // Set the new circle velocity by reflecting the old velocity in
      // `bounceLineNormal`.
      var dot = trig.dotProduct(circle.velocity, bounceLineNormal);
      circle.velocity.x -= 2 * dot * bounceLineNormal.x;
      circle.velocity.y -= 2 * dot * bounceLineNormal.y;

      // Move the circle until it has cleared the line.  This stops
      // the circle getting stuck in the line.
      while (trig.isLineIntersectingCircle(circle, line)) {
        physics.moveCircle(circle);
      }
    },

    // **bounceLineNormal()** assumes `line` intersects `circle`.  It
    // returns the normal to the side of the line that the `circle` is
    // hitting.
    bounceLineNormal: function(circle, line) {

      // Get vector that starts at the closest point on
      // the line and ends at the circle.  If the circle is hitting
      // the flat of the line, this vector will point perpenticular to
      // the line.  If the circle is hitting the end of the line, the
      // vector will point from the end to the center of the circle.
      var circleToClosestPointOnLineVector =
          trig.vectorBetween(
            trig.pointOnLineClosestToCircle(circle, line),
            circle.center);

      // Make the normal a unit vector and return it.
      return trig.unitVector(circleToClosestPointOnLineVector);
    }
  };

  // Start
  // -----

  // When the DOM is ready, start the simulation.
  window.addEventListener('load', start);
})(this);
