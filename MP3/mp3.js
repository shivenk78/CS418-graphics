/**
 * Project author Shiven Kumar <shivenk2@illinois.edu>
 * @file MP3.js - A simple WebGL rendering engine
 * @author Ian Rudnick <itr2@illinois.edu>
 * @brief Starter code for CS 418 MP2 at the University of Illinois at
 * Urbana-Champaign.
 *
 * Updated Spring 2021 for WebGL 2.0/GLSL 3.00 ES.
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas to draw on */
var canvas;

/** @global The GLSL shader program */
var shaderProgram;

/** @global An object holding the geometry for your 3D terrain */
var myTerrain;

/** @global The Model matrix */
var modelViewMatrix = glMatrix.mat4.create();
/** @global The Projection matrix */
var projectionMatrix = glMatrix.mat4.create();
/** @global The Normal matrix */
var normalMatrix = glMatrix.mat3.create();

// Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [227 / 255, 191 / 255, 76 / 255];
/** @global Diffuse material color/intensity for Phong reflection */
var kDiffuse = [227 / 255, 191 / 255, 76 / 255];
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [1.0, 1.0, 1.0]; //[227 / 255, 191 / 255, 76 / 255];
/** @global Shininess exponent for Phong reflection */
var shininess = 2;

// Light parameters
/** @global Light position in VIEW coordinates */
var lightPosition = [0, 0, 0];
/** @global Ambient light color/intensity for Phong reflection */
var ambientLightColor = [0.1, 0.1, 0.1];
/** @global Diffuse light color/intensity for Phong reflection */
var diffuseLightColor = [1, 1, 1];
/** @global Specular light color/intensity for Phong reflection */
var specularLightColor = [1, 1, 1];

/** @global Edge color for black wireframe */
var kEdgeBlack = [0.0, 0.0, 0.0];
/** @global Edge color for white wireframe */
var kEdgeWhite = [0.7, 0.7, 0.7];

// MP3 NEW VARS
/** @global Initial camera position */
var camInitialPosition = [0, 0, 5];
/** @global Camera position */
var camPosition = camInitialPosition;
/** @global Camera orientation QUATERNION */
var camOrientation = glMatrix.quat.create();
/** @global Current camera speed */
var camSpeed = 0.01;
/** @global Camera speed delta for keypresses */
const camDeltaSpeed = 0.005;
/** @global Initial direction of camera */
const camInitialDir = [1, 0, 0];

/** @global Dictionary of pressed keys */
var keys = {};

/** @global The Fog Density slider */
var densitySlider;
/** @global The Fog Density value display box */
var densityBox;
/** @global The default Fog Color */
const FOG_COLOR = [1, 1, 1, 1];

/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

//-----------------------------------------------------------------------------
// Setup functions (run once)
/**
 * Startup function called from the HTML code to start program.
 */
function startup() {
  // Set up the canvas with a WebGL context.
  canvas = document.getElementById("glCanvas");
  gl = createGLContext(canvas);

  // Register event handlers
  document.onkeydown = keyDown;
  document.onkeyup = keyUp;

  // Compile and link the shader program.
  setupShaders();

  // Setup the slider
  densitySlider = document.getElementById("fogDensity");
  densityBox = document.getElementById("densityLabel");

  densityBox.innerHTML = densitySlider.value;
  densitySlider.oninput = function () {
    densityBox.innerHTML = this.value;
  };

  // Let the Terrain object set up its own buffers.
  myTerrain = new Terrain(100, -50, 50, -50, 50);
  myTerrain.setupBuffers(shaderProgram);

  // Set the background color to sky blue (you can change this if you like).
  gl.clearColor(0.9, 0.9, 0.9, 1.0);

  gl.enable(gl.DEPTH_TEST);
  requestAnimationFrame(animate);
}

/**
 * Creates a WebGL 2.0 context.
 * @param {element} canvas The HTML5 canvas to attach the context to.
 * @return {Object} The WebGL 2.0 context.
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
 * Loads a shader from the HTML document and compiles it.
 * @param {string} id ID string of the shader script to load.
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);

  // Return null if we don't find an element with the specified id
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
 * Sets up the vertex and fragment shaders.
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

  // We only need the one shader program for this rendering, so we can just
  // bind it as the current program here.
  gl.useProgram(shaderProgram);

  // Query the index of each attribute and uniform in the shader program.
  shaderProgram.locations = {};
  shaderProgram.locations.vertexPosition = gl.getAttribLocation(
    shaderProgram,
    "vertexPosition"
  );
  shaderProgram.locations.vertexNormal = gl.getAttribLocation(
    shaderProgram,
    "vertexNormal"
  );

  shaderProgram.locations.modelViewMatrix = gl.getUniformLocation(
    shaderProgram,
    "modelViewMatrix"
  );
  shaderProgram.locations.projectionMatrix = gl.getUniformLocation(
    shaderProgram,
    "projectionMatrix"
  );
  shaderProgram.locations.normalMatrix = gl.getUniformLocation(
    shaderProgram,
    "normalMatrix"
  );

  shaderProgram.locations.kAmbient = gl.getUniformLocation(
    shaderProgram,
    "kAmbient"
  );
  shaderProgram.locations.kDiffuse = gl.getUniformLocation(
    shaderProgram,
    "kDiffuse"
  );
  shaderProgram.locations.kSpecular = gl.getUniformLocation(
    shaderProgram,
    "kSpecular"
  );
  shaderProgram.locations.shininess = gl.getUniformLocation(
    shaderProgram,
    "shininess"
  );

  shaderProgram.locations.lightPosition = gl.getUniformLocation(
    shaderProgram,
    "lightPosition"
  );
  shaderProgram.locations.ambientLightColor = gl.getUniformLocation(
    shaderProgram,
    "ambientLightColor"
  );
  shaderProgram.locations.diffuseLightColor = gl.getUniformLocation(
    shaderProgram,
    "diffuseLightColor"
  );
  shaderProgram.locations.specularLightColor = gl.getUniformLocation(
    shaderProgram,
    "specularLightColor"
  );

  // MY CUSTOM VARS
  shaderProgram.locations.minElevation = gl.getUniformLocation(
    shaderProgram,
    "minElevation"
  );
  shaderProgram.locations.maxElevation = gl.getUniformLocation(
    shaderProgram,
    "maxElevation"
  );

  // FOG VARS
  shaderProgram.locations.fogColor = gl.getUniformLocation(
    shaderProgram,
    "fogColor"
  );
  shaderProgram.locations.fogDensity = gl.getUniformLocation(
    shaderProgram,
    "fogDensity"
  );
}

/**
 * Draws the terrain to the screen.
 */
function draw() {
  // Transform the clip coordinates so the render fills the canvas dimensions.
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  // Clear the color buffer and the depth buffer.
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Generate the projection matrix using perspective projection.
  const near = 0.1;
  const far = 200.0;
  glMatrix.mat4.perspective(
    projectionMatrix,
    degToRad(45),
    gl.viewportWidth / gl.viewportHeight,
    near,
    far
  );

  // Generate the view matrix using lookat.
  // const lookAtPt = glMatrix.vec3.fromValues(0.0, 0.0, -1.0);
  // const eyePt = glMatrix.vec3.fromValues(100, 50, 100.0);
  // const up = glMatrix.vec3.fromValues(0.0, 0.0, 1.0);
  // glMatrix.mat4.lookAt(modelViewMatrix, eyePt, lookAtPt, up);

  setMatrixUniforms();
  setLightUniforms(
    ambientLightColor,
    diffuseLightColor,
    specularLightColor,
    lightPosition
  );

  // CUSTOM VARS
  var maxElev = myTerrain.getMaxElevation();
  setElevationVars(myTerrain.getMinElevation(), maxElev);

  // FOG
  setFogVars(FOG_COLOR, densitySlider.value);

  // Draw the triangles, the wireframe, or both, based on the render selection.
  if (document.getElementById("polygon").checked) {
    setMaterialUniforms(kAmbient, kDiffuse, kSpecular, shininess);
    myTerrain.drawTriangles();
  } else if (document.getElementById("wirepoly").checked) {
    setMaterialUniforms(kAmbient, kDiffuse, kSpecular, shininess);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1, 1);
    myTerrain.drawTriangles();
    gl.disable(gl.POLYGON_OFFSET_FILL);
    setMaterialUniforms(kEdgeBlack, kEdgeBlack, kEdgeBlack, shininess);
    myTerrain.drawEdges();
  } else if (document.getElementById("wireframe").checked) {
    setMaterialUniforms(kEdgeBlack, kEdgeBlack, kEdgeBlack, shininess);
    myTerrain.drawEdges();
  }

  camInitialPosition = [0, 0, maxElev + 1];
}

/**
 * Sends the three matrix uniforms to the shader program.
 */
function setMatrixUniforms() {
  gl.uniformMatrix4fv(
    shaderProgram.locations.modelViewMatrix,
    false,
    modelViewMatrix
  );
  gl.uniformMatrix4fv(
    shaderProgram.locations.projectionMatrix,
    false,
    projectionMatrix
  );

  // We want to transform the normals by the inverse-transpose of the
  // Model/View matrix
  glMatrix.mat3.fromMat4(normalMatrix, modelViewMatrix);
  glMatrix.mat3.transpose(normalMatrix, normalMatrix);
  glMatrix.mat3.invert(normalMatrix, normalMatrix);

  gl.uniformMatrix3fv(
    shaderProgram.locations.normalMatrix,
    false,
    normalMatrix
  );
}

/**
 * Sends material properties to the shader program.
 * @param {Float32Array} a Ambient material color.
 * @param {Float32Array} d Diffuse material color.
 * @param {Float32Array} s Specular material color.
 * @param {Float32} alpha shininess coefficient
 */
function setMaterialUniforms(a, d, s, alpha) {
  gl.uniform3fv(shaderProgram.locations.kAmbient, a);
  gl.uniform3fv(shaderProgram.locations.kDiffuse, d);
  gl.uniform3fv(shaderProgram.locations.kSpecular, s);
  gl.uniform1f(shaderProgram.locations.shininess, alpha);
}

/**
 * Sends light information to the shader program.
 * @param {Float32Array} a Ambient light color/intensity.
 * @param {Float32Array} d Diffuse light color/intensity.
 * @param {Float32Array} s Specular light color/intensity.
 * @param {Float32Array} loc The light position, in view coordinates.
 */
function setLightUniforms(a, d, s, loc) {
  gl.uniform3fv(shaderProgram.locations.ambientLightColor, a);
  gl.uniform3fv(shaderProgram.locations.diffuseLightColor, d);
  gl.uniform3fv(shaderProgram.locations.specularLightColor, s);
  gl.uniform3fv(shaderProgram.locations.lightPosition, loc);
}

/**
 * Sends elevation information to the shader program.
 * @param {*} minElevation lowest Z-height of terrain
 * @param {*} maxElevation highest Z-height of terrain
 */
function setElevationVars(minElevation, maxElevation) {
  gl.uniform1f(shaderProgram.locations.minElevation, minElevation);
  gl.uniform1f(shaderProgram.locations.maxElevation, maxElevation);
}

/**
 * Sends fog information to the shader program.
 * @param {*} fogColor color for fog
 * @param {*} fogDensity density for fog (0 if off)
 */
function setFogVars(fogColor, fogDensity) {
  gl.uniform1f(shaderProgram.locations.fogColor, fogColor);
  gl.uniform1f(shaderProgram.locations.fogDensity, fogDensity);
}

/**
 * Animates...allows user to change the geometry view between
 * wireframe, polgon, or both.
 */
function animate(currentTime) {
  var eulerX = 0;
  var eulerY = 0;
  var eulerZ = 0;
  var EULER_DELTA = 1;

  // Handle key events
  if (keys["ArrowRight"] || keys["d"]) {
    eulerX += EULER_DELTA;
  } else if (keys["ArrowLeft"] || keys["a"]) {
    eulerX -= EULER_DELTA;
  } // roll

  if (keys["ArrowUp"] || keys["w"]) {
    eulerY += EULER_DELTA;
  } else if (keys["ArrowDown"] || keys["s"]) {
    eulerY -= EULER_DELTA;
  } // pitch

  if (keys["+"] || keys["="]) {
    camSpeed += camDeltaSpeed;
  } else if (keys["-"] || keys["_"]) {
    camSpeed -= camDeltaSpeed;
  } // speed
  if (camSpeed < camDeltaSpeed) camSpeed = camDeltaSpeed;

  if (keys["Escape"]) {
    camPosition = camInitialPosition;
    camOrientation = glMatrix.quat.create();
  } // reset view

  // Calculate pitch and roll quaternions from Euler
  var orientationDelta = glMatrix.quat.create();
  glMatrix.quat.fromEuler(orientationDelta, eulerX, eulerY, eulerZ);
  glMatrix.quat.mul(camOrientation, camOrientation, orientationDelta);

  // Update position
  var forwardDirection = glMatrix.vec3.create();
  glMatrix.vec3.transformQuat(forwardDirection, camInitialDir, camOrientation);
  glMatrix.vec3.normalize(forwardDirection, forwardDirection);
  var deltaPos = glMatrix.vec3.scale(
    forwardDirection,
    forwardDirection,
    camSpeed
  );
  glMatrix.vec3.add(camPosition, camPosition, deltaPos);

  // Generate new View (lookat) matrix
  var newUp = [0, 0, 0];
  glMatrix.vec3.transformQuat(newUp, [0.0, 0.0, 1.0], camOrientation);
  var newCenter = [0, 0, 0];
  var currViewDir = [0, 0, 0];
  glMatrix.vec3.transformQuat(currViewDir, camInitialDir, camOrientation);
  glMatrix.vec3.add(newCenter, camPosition, currViewDir);

  // Orig values for references
  // const lookAtPt = glMatrix.vec3.fromValues(0.0, 0.0, -1.0);
  // const eyePt = glMatrix.vec3.fromValues(100, 50, 100.0);
  // const up = glMatrix.vec3.fromValues(0.0, 0.0, 1.0);
  glMatrix.mat4.lookAt(modelViewMatrix, camPosition, newCenter, newUp);

  console.log(camPosition, camOrientation);

  // Draw the frame.
  draw();
  // Animate the next frame.
  requestAnimationFrame(animate);
}

/**
 * Handles down key presses to deal with user input
 * @param {Event} event the registered event
 */
function keyDown(event) {
  keys[event.key] = true;
}

/**
 * Handles up key releases to deal with user input
 * @param {Event} event the registered event
 */
function keyUp(event) {
  keys[event.key] = false;
}
