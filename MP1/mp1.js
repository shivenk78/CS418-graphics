/**
 * @file MP1 - Simple animations
 * @author Shiven Kumar <shivenk2@illinois.edu>
 *
 * Updated Spring 2021 to use WebGL 2.0 and GLSL 3.00
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;

/** @global The WebGL buffer holding the triangle */
var vertexPositionBuffer;

/** @global The WebGL buffer holding the vertex colors */
var vertexColorBuffer;

/** @global The vertex array object for the triangle */
var vertexArrayObject;

/** @global The rotation angle of our triangle */
var rotAngle = 0;

/** @global The ModelView matrix contains any modeling and viewing transformations */
var modelViewMatrix = glMatrix.mat4.create();

/** @global Records time last frame was rendered */
var previousTime = 0;

// New Globals
/** @global Keeps track of the current scale of the Block I */
var currBlockScale = 1.0;

/** @global Keeps track of if the Block I is currently getting bigger or smaller */
var isBlockScaleIncreasing = true;

/** @global Maximum scaling for Block I */
const MAX_BLOCK_SCALE = 1.05;
/** @global Minimum scaling for Block I */
const MIN_BLOCK_SCALE = 0.95;

/** @global Keeps track of the current y-position that will be "widened" */
var vertPosToWiden = 1.0;
/** @global y-range within which to widen the Block I */
var vertRangeForWiden = 0.2;
/** @global Factor by which to widen the Block I */
var horizWidenFactor = 1.2;

/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var context = null;
  context = canvas.getContext("webgl2");
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

/**
 * Loads a shader.
 * Retrieves the source code from the HTML document and compiles it.
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);

  // If we don't find an element with the specified id
  // we do an early exit
  if (!shaderScript) {
    return null;
  }

  var shaderSource = shaderScript.text;

  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }

  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

/**
 * Set up the fragment and vertex shaders.
 */
function setupShaders() {
  // Compile the shaders' source code.
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");

  // Link the shaders together into a program.
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  // We only use one shader program for this example, so we can just bind
  // it as the current program here.
  gl.useProgram(shaderProgram);

  // Query the index of each attribute in the list of attributes maintained
  // by the GPU.
  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(
    shaderProgram,
    "aVertexPosition"
  );
  shaderProgram.vertexColorAttribute = gl.getAttribLocation(
    shaderProgram,
    "aVertexColor"
  );

  //Get the index of the Uniform variable as well
  shaderProgram.modelViewMatrixUniform = gl.getUniformLocation(
    shaderProgram,
    "uModelViewMatrix"
  );
}

/**
 * Set up the buffers to hold the triangle's vertex positions and colors.
 */
function setupBuffers() {
  // Create the vertex array object, which holds the list of attributes for
  // the triangle.
  vertexArrayObject = gl.createVertexArray();
  gl.bindVertexArray(vertexArrayObject);

  // Create a buffer for positions, and bind it to the vertex array object.
  vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);

  // Define a triangle in clip coordinates.
  // prettier-ignore
  // var vertices = [
  //   -0.5, 0.5, 0.0,
  //   -0.5, -0.5, 0.0,
  //   0.5, -0.5, 0.0,
  // ];

  // Define BLOCK I in clip coordinates.
  // prettier-ignore
  var vertices = [
    0.5, 0.75, 0.0, -0.5, 0.75, 0.0, -0.5, 0.5, 0.0,
    0.5, 0.75, 0.0, 0.5, 0.5, 0.0, -0.5, 0.5, 0.0,
    0.2, 0.5, 0.0, -0.2, 0.5, 0.0, -0.2, -0.5, 0.0,
    0.2, 0.5, 0.0, 0.2, -0.5, 0.0, -0.2, -0.5, 0.0,
    0.5, -0.75, 0.0, -0.5, -0.75, 0.0, -0.5, -0.5, 0.0,
    0.5, -0.75, 0.0, 0.5, -0.5, 0.0, -0.5, -0.5, 0.0,
  ];

  var vertexSize = 3;
  var numVertices = vertices.length / vertexSize;

  // CUSTOM DIRECT ANIMATION - top-to-bottom "widening" of the Block I

  vertPosToWiden -= 0.005;
  if (vertPosToWiden < -1) vertPosToWiden = 1;
  for (var i = 0; i < numVertices; i++) {
    var yPos = vertices[i * vertexSize + 1];
    console.log("hi", yPos); //Math.abs(yPos - vertPosToWiden));
    if (Math.abs(yPos - vertPosToWiden) < vertRangeForWiden) {
      // modify x-coordinate to "widen" it
      vertices[i * 3] *= horizWidenFactor;
      console.log(vertices);
    }
  }

  // Populate the buffer with the position data.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
  vertexPositionBuffer.itemSize = vertexSize;
  vertexPositionBuffer.numberOfItems = numVertices;

  // Binds the buffer that we just made to the vertex position attribute.
  gl.vertexAttribPointer(
    shaderProgram.vertexPositionAttribute,
    vertexPositionBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // Do the same steps for the color buffer.
  vertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  // prettier-ignore
  var ORANGE = [0.91, 0.29, 0.15, 1.0];
  var colors = [];
  // generate same orange color for every vertex
  for (var i = 0; i < vertexPositionBuffer.numberOfItems; i++) {
    for (var j = 0; j < ORANGE.length; j++) colors.push(ORANGE[j]);
  }

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
  vertexColorBuffer.itemSize = 4;
  vertexColorBuffer.numItems = colors.length / vertexColorBuffer.itemSize;
  gl.vertexAttribPointer(
    shaderProgram.vertexColorAttribute,
    vertexColorBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // Enable each attribute we are using in the VAO.
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

  // Unbind the vertex array object to be safe.
  gl.bindVertexArray(null);
}

/**
 * Draws a frame to the screen.
 */
function draw() {
  // Transform the clip coordinates so the render fills the canvas dimensions.
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

  // Clear the screen.
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Use the vertex array object that we set up.
  gl.bindVertexArray(vertexArrayObject);

  // Send the ModelView matrix with our transformations to the vertex shader.
  gl.uniformMatrix4fv(
    shaderProgram.modelViewMatrixUniform,
    false,
    modelViewMatrix
  );

  // Render the triangle.
  gl.drawArrays(gl.TRIANGLES, 0, vertexPositionBuffer.numberOfItems);
  // Unbind the vertex array object to be safe.
  gl.bindVertexArray(null);
}

/**
 * Animates the triangle by updating the ModelView matrix with a rotation
 * each frame.
 */
function animate(currentTime) {
  // Read the speed slider from the web page.
  var speed = 5;

  // Convert the time to seconds.
  currentTime *= 0.001;
  // Subtract the previous time from the current time.
  var deltaTime = currentTime - previousTime;
  // Remember the current time for the next frame.
  previousTime = currentTime;

  // Update geometry to rotate 'speed' degrees per second.
  rotAngle += speed * deltaTime;
  if (rotAngle > 360.0) rotAngle = 0.0;
  glMatrix.mat4.fromZRotation(modelViewMatrix, degToRad(rotAngle));

  // Update geometry to scale the Block I
  if (currBlockScale <= MIN_BLOCK_SCALE) {
    currBlockScale = MIN_BLOCK_SCALE;
    isBlockScaleIncreasing = true;
  } else if (currBlockScale >= MAX_BLOCK_SCALE) {
    currBlockScale = MAX_BLOCK_SCALE;
    isBlockScaleIncreasing = false;
  }

  currBlockScale += isBlockScaleIncreasing
    ? 0.01 * speed * deltaTime
    : -0.01 * speed * deltaTime;

  var scaleVec = [currBlockScale, currBlockScale, currBlockScale];
  glMatrix.mat4.scale(modelViewMatrix, modelViewMatrix, scaleVec);
  setupBuffers();

  // Draw the frame.
  draw();

  // Animate the next frame. The animate function is passed the current time in
  // milliseconds.
  requestAnimationFrame(animate);
}

/**
 * Startup function called from html code to start the program.
 */
function startup() {
  console.log("Starting animation...");
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers();
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  requestAnimationFrame(animate);
}
