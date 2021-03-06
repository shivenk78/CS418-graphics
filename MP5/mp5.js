/**
 * @file MP5.js - A simple WebGL rendering engine
 * @author Ian Rudnick <itr2@illinois.edu>
 * @brief Starter code for CS 418 MP5 at the University of Illinois at
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

/** @global An object holding the geometry for your 3D model */
var sphere1;

/** @global The Model matrix */
var modelViewMatrix = glMatrix.mat4.create();
/** @global The Model matrix */
var viewMatrix = glMatrix.mat4.create();
/** @global The Projection matrix */
var projectionMatrix = glMatrix.mat4.create();
/** @global The Normal matrix */
var normalMatrix = glMatrix.mat3.create();

// Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [0.25, 0.75, 1.0];
/** @global Diffuse material color/intensity for Phong reflection */
var kDiffuse = [0.25, 0.75, 1.0];
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [1.0, 1.0, 1.0];
/** @global Shininess exponent for Phong reflection */
var shininess = 2;

/** @global Ambient light color */
const lAmbient = [0.4, 0.4, 0.4];
/** @global Diffuse light color */
const lDiffuse = [1.0, 1.0, 1.0];
/** @global Specular  light color */
const lSpecular = [1.0, 1.0, 1.0];

/** MY NEW VARS */
/** @global Dimension of box. Represents distance in every direction from Origin. Thus, the box will be of size (2*BOX_DIM, 2*BOX_DIM, 2*BOX_DIM) */
const BOX_DIM = 50;
/** @global Gravity acceleration constant */
const GRAV = -100;
/** @global Gravity acceleration vector */
const GRAV_VEC = [0, GRAV, 0];
/** @global Drag constant */
const DRAG = 0.5;
/** @global Bounce constant c */
const BOUNCE_C = 0.8;
/** @global Number of spheres to add on keypress */
const N_SPHERES = 5;

/** @global Dictionary of pressed keys */
var keys = {};

/** @global Sphere positions */
var spherePos = [];
/** @global Sphere velocities */
var sphereVel = [];
/** @global Sphere radii */
var sphereRad = [];
/** @global Sphere colors */
var sphereCol = [];
/** @global Spheres which are at rest on the ground */
var spheresAtRest = [];

/** @global Previous animation time */
var previousTime = 0;

/** @global Array of the 6 wall normals */
var wallNormals = [];

/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

//-----------------------------------------------------------------------------
// Setup functions (run once when the webpage loads)
/**
 * Startup function called from the HTML code to start program.
 */
function startup() {
  // Set up the canvas with a WebGL context.
  canvas = document.getElementById("glCanvas");
  gl = createGLContext(canvas);

  // Register key event handlers
  document.onkeydown = keyDown;
  document.onkeyup = keyUp;

  // Compile and link a shader program.
  setupShaders();

  // Create a sphere mesh and set up WebGL buffers for it.
  sphere1 = new Sphere(5);
  sphere1.setupBuffers(shaderProgram);

  // Generate wall normals
  createWallNormals();

  // Create ONE sphere to start
  createSphere();

  // Create the projection matrix with perspective projection.
  const near = -100.0;
  const far = 100.0;
  glMatrix.mat4.perspective(
    projectionMatrix,
    degToRad(45),
    gl.viewportWidth / gl.viewportHeight,
    near,
    far
  );

  // Set the background color to black (you can change this if you like).
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);

  // Start animating.
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

  // If you have multiple different shader programs, you'll need to move this
  // function to draw() and call it whenever you want to switch programs
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
}

//-----------------------------------------------------------------------------
// Animation functions (run every frame)
/**
 * Draws the current frame and then requests to draw the next frame.
 * @param {number} currentTime The elapsed time in milliseconds since the
 *    webpage loaded.
 */
function animate(currentTime) {
  // Add code here using currentTime if you want to add animations

  // from mp1
  // Convert the time to seconds.
  currentTime *= 0.001;
  // Subtract the previous time from the current time.
  var deltaTime = currentTime - previousTime;
  // Remember the current time for the next frame.
  previousTime = currentTime;

  // check keypresses for spheres
  if (keys["a"]) {
    // add spheres
    for (var i = 0; i < N_SPHERES; i++) {
      createSphere();
    }
    console.log("Simulation now contains ", spherePos.length, " spheres");
    keys["a"] = false; // helps with "debouncing" to avoid repeated presses
  } else if (keys["r"]) {
    // clear spheres
    spherePos = [];
    sphereVel = [];
    sphereRad = [];
    sphereCol = [];
    keys["r"] = false;
    console.log("Simulation cleared. 0 spheres");
  }

  // Set up the canvas for this frame
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var modelMatrix = glMatrix.mat4.create();
  var viewMatrix = glMatrix.mat4.create();

  // Create the view matrix using lookat.
  const lookAtPt = glMatrix.vec3.fromValues(0.0, 0.0, 0.0);
  const eyePt = glMatrix.vec3.fromValues(0.0, 0.0, 200.0);
  const up = glMatrix.vec3.fromValues(0.0, 1.0, 0.0);
  glMatrix.mat4.lookAt(viewMatrix, eyePt, lookAtPt, up);

  // Concatenate the model and view matrices.
  // Remember matrix multiplication order is important.
  glMatrix.mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);

  setMatrixUniforms();

  // Transform the light position to view coordinates
  var lightPosition = glMatrix.vec3.fromValues(5, 5, -5);
  glMatrix.vec3.transformMat4(lightPosition, lightPosition, viewMatrix);

  setLightUniforms(lAmbient, lDiffuse, lSpecular, lightPosition);
  setMaterialUniforms(kAmbient, kDiffuse, kSpecular, shininess);

  // You can draw multiple spheres by changing the modelViewMatrix, calling
  // setMatrixUniforms() again, and calling gl.drawArrays() again for each
  // sphere. You can use the same sphere object and VAO for all of them,
  // since they have the same triangle mesh.

  sphere1.bindVAO();
  var translationMat = glMatrix.mat4.create();
  var radiusMat = glMatrix.mat4.create();
  for (var i = 0; i < spherePos.length; i++) {
    // update position and velocity
    performPhysicsUpdate(i, deltaTime);

    // create the translated and scaled matrix for this particle's position and radius
    glMatrix.mat4.fromTranslation(translationMat, spherePos[i]);
    var radiusVec = [sphereRad[i], sphereRad[i], sphereRad[i]];
    glMatrix.mat4.fromScaling(radiusMat, radiusVec);

    // create the new model matrix
    glMatrix.mat4.multiply(modelMatrix, translationMat, radiusMat);

    // Concatenate the model and view matrices.
    // Remember matrix multiplication order is important.
    glMatrix.mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);

    // set colors
    kAmbient = sphereCol[i];
    kDiffuse = sphereCol[i];

    // set uniforms for shaders
    setMatrixUniforms();
    setMaterialUniforms(kAmbient, kDiffuse, kSpecular, shininess);

    // draw
    gl.drawArrays(gl.TRIANGLES, 0, sphere1.numTriangles * 3);
  }
  sphere1.unbindVAO();

  // Use this function as the callback to animate the next frame.
  requestAnimationFrame(animate);
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
 * Creates a sphere, with appropriate random position, velocity, etc.
 */
function createSphere() {
  var col = [Math.random(), Math.random(), Math.random()];
  var rad = randValInRange(1, 5);
  const dimMinusRad = BOX_DIM - rad - 1;
  var pos = [
    randValInRange(-dimMinusRad, dimMinusRad),
    randValInRange(-dimMinusRad, dimMinusRad),
    randValInRange(-dimMinusRad, dimMinusRad),
  ];

  // create a random velocity direction, scaled randomly in a range.
  var vel_mag = randValInRange(1, 10 * Math.abs(GRAV));
  var vel = [0, 0, 0];
  glMatrix.vec3.random(vel, vel_mag);

  spherePos.push(pos);
  sphereVel.push(vel);
  sphereRad.push(rad);
  sphereCol.push(col);
  spheresAtRest.push(false);
}

/**
 * Performs physics updates - velocity, position, collision, etc.
 * @param {Integer} s Index of the sphere to modify
 * @param {Float} deltaTime Time change for physics update
 */
function performPhysicsUpdate(s, deltaTime) {
  // velocity
  // v_new = v * drag^t + accel * t
  glMatrix.vec3.scale(sphereVel[s], sphereVel[s], Math.pow(DRAG, deltaTime));
  var accelTerm = [0, 0, 0];
  glMatrix.vec3.scale(accelTerm, GRAV_VEC, deltaTime);
  glMatrix.vec3.add(sphereVel[s], sphereVel[s], accelTerm);

  // position
  // pos_new = pos + v * t
  var initPosition = glMatrix.vec3.clone(spherePos[s]);
  var initVel = glMatrix.vec3.clone(sphereVel[s]);
  var velTerm = [0, 0, 0];
  glMatrix.vec3.scale(velTerm, sphereVel[s], deltaTime);
  glMatrix.vec3.add(spherePos[s], spherePos[s], velTerm);

  // collision with walls - iterate through the axes
  // wall
  var min_t = Infinity;
  var wallNormal = [0, 0, 0];
  for (var i = 0; i < 3; i++) {
    var p = spherePos[s][i];
    if (p + sphereRad[s] >= BOX_DIM) {
      var t = (BOX_DIM - sphereRad[s] - initPosition[i]) / sphereVel[s][i];
      if (t < min_t) {
        min_t = t;
        // too far in POSITIVE direction, so wall 2*i+1
        wallNormal = wallNormals[2 * i + 1];
      }
    } else if (p - sphereRad[s] <= -BOX_DIM) {
      var t = (-BOX_DIM + sphereRad[s] - initPosition[i]) / sphereVel[s][i];
      if (t < min_t) {
        min_t = t;
        // too far in NEGATIVE direction, so wall 2*i
        wallNormal = wallNormals[2 * i];
      }
    }
  }

  // if collided, resolve the collision!
  if (min_t !== Infinity) {
    // v2 = v1 - 2 * (v1 . n) * n
    var velDotNorm = glMatrix.vec3.dot(sphereVel[s], wallNormal);
    var scaledNorm = glMatrix.vec3.clone(wallNormal);
    glMatrix.vec3.scale(scaledNorm, scaledNorm, 2 * velDotNorm);
    var newVel = [0, 0, 0];
    glMatrix.vec3.sub(newVel, sphereVel[s], scaledNorm);
    // ||v2|| = c ||v1||
    glMatrix.vec3.scale(newVel, newVel, BOUNCE_C);
    sphereVel[s] = newVel;

    // re-update position
    // pos_col = initPos + t * v
    var velTerm = [0, 0, 0];
    glMatrix.vec3.scale(velTerm, initVel, min_t);
    glMatrix.vec3.add(spherePos[s], initPosition, velTerm);
  }
}

/**
 * Creates the wall normals, all as unit vectors.
 * The wall at positive BOX_DIM of an axis 'i' is at index 2*i+1.
 */
function createWallNormals() {
  for (var i = 0; i < 3; i++) {
    var posWall = [0, 0, 0];
    var negWall = [0, 0, 0];

    posWall[i] = 1;
    negWall[i] = -1;

    wallNormals.push(posWall);
    wallNormals.push(negWall);
  }
  console.log("Created normals: ", wallNormals);
}

/**
 * Get a random value in a range
 * @param {Float} low
 * @param {Float} hi
 * @returns Float value in range [low, hi)
 */
function randValInRange(low, hi) {
  return Math.random() * (hi - low) + low;
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
