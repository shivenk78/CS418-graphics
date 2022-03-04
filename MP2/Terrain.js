/**
 * @file Terrain.js - A simple 3D terrain model for WebGL
 * @author Ian Rudnick <itr2@illinois.edu>
 * @brief Starter code for CS 418 MP2 at the University of Illinois at
 * Urbana-Champaign.
 *
 * Updated Spring 2021 for WebGL 2.0/GLSL 3.00 ES.
 *
 * You'll need to implement the following functions:
 * setVertex(v, i) - convenient vertex access for 1-D array
 * getVertex(v, i) - convenient vertex access for 1-D array
 * generateTriangles() - generate a flat grid of triangles
 * shapeTerrain() - shape the grid into more interesting terrain
 * calculateNormals() - calculate normals after warping terrain
 *
 * Good luck! Come to office hours if you get stuck!
 */

class Terrain {
  /**
   * Initializes the members of the Terrain object.
   * @param {number} div Number of triangles along the x-axis and y-axis.
   * @param {number} minX Minimum X coordinate value.
   * @param {number} maxX Maximum X coordinate value.
   * @param {number} minY Minimum Y coordinate value.
   * @param {number} maxY Maximum Y coordinate value.
   */
  constructor(div, minX, maxX, minY, maxY) {
    this.div = div;
    this.minX = minX;
    this.minY = minY;
    this.maxX = maxX;
    this.maxY = maxY;

    // MY CONSTANTS

    // Number of iterations for faulting
    this.FAULT_ITER = 100;
    // Initial vertical delta-shift for faulting
    this.INIT_DELTA = 0.5;
    // Per-iteration falloff constant H for faulting delta
    this.FAULT_H = 0.01;
    // Max dist for distance-based faulting perturbation
    this.R_DIST = 0.5 * (this.maxX - this.minX);

    // Allocate the vertex array
    this.positionData = [];
    // Allocate the normal array.
    this.normalData = [];
    // Allocate the triangle array.
    this.faceData = [];
    // Allocate an array for edges so we can draw a wireframe.
    this.edgeData = [];
    console.log("Terrain: Allocated buffers");

    this.generateTriangles();
    console.log("Terrain: Generated triangles");

    this.generateLines();
    console.log("Terrain: Generated lines");

    this.shapeTerrain();
    console.log("Terrain: Sculpted terrain");

    this.calculateNormals();
    console.log("Terrain: Generated normals");

    // You can use this function for debugging your buffers:
    //this.printBuffers();
  }

  //-------------------------------------------------------------------------
  // Vertex access and triangle generation - your code goes here!
  /**
   * Set the x,y,z coords of the ith vertex
   * @param {Object} v An array of length 3 holding the x,y,z coordinates.
   * @param {number} i The index of the vertex to set.
   */
  setVertex(v, i) {
    this.positionData[i * 3] = v[0];
    this.positionData[i * 3 + 1] = v[1];
    this.positionData[i * 3 + 2] = v[2];
  }

  /**
   * Returns the x,y,z coords of the ith vertex.
   * @param {Object} v An array of length 3 to hold the x,y,z coordinates.
   * @param {number} i The index of the vertex to get.
   */
  getVertex(v, i) {
    v[0] = this.positionData[i * 3];
    v[1] = this.positionData[i * 3 + 1];
    v[2] = this.positionData[i * 3 + 2];
  }

  /**
   * Generates a grid of vertices, populating it with triangles (2 per grid square).
   */
  generateTriangles() {
    // MP2: Implement the rest of this function!

    var deltaX = (this.maxX - this.minX) / this.div;
    var deltaY = (this.maxY - this.minY) / this.div;

    for (var i = 0; i <= this.div; i++) {
      for (var j = 0; j <= this.div; j++) {
        this.positionData.push(this.minX + j * deltaX);
        this.positionData.push(this.minY + i * deltaY);
        this.positionData.push(0); // initial Z values are all 0
      }
    }

    for (var xSq = 0; xSq < this.div; xSq++) {
      for (var ySq = 0; ySq < this.div; ySq++) {
        var botLeft = xSq * (this.div + 1) + ySq;
        var botRight = botLeft + 1;
        var topLeft = (xSq + 1) * (this.div + 1) + ySq;
        var topRight = topLeft + 1;

        // triangle 1 - lower right - /_|
        this.faceData.push(botLeft, botRight, topRight);
        // triangle 2 - upper left - |-/
        this.faceData.push(botLeft, topRight, topLeft);
      }
    }

    // We'll need these to set up the WebGL buffers.
    this.numVertices = this.positionData.length / 3;
    this.numFaces = this.faceData.length / 3;

    //this.printBuffers();
  }

  /**
   * This function shapes the terrain randomly using faulting.
   */
  shapeTerrain() {
    var delta = this.INIT_DELTA;
    for (var iter = 0; iter < this.FAULT_ITER; iter++) {
      // Generate random plane with a point and a normal
      var p = [
        this.randRange(this.minX, this.maxX),
        this.randRange(this.minY, this.maxY),
        0,
      ];

      var randVec2 = [0, 0];
      glMatrix.vec2.random(randVec2);
      var n = [randVec2[0], randVec2[1], 0];

      console.log(p, n);

      // Raise and lower vertices
      for (var v = 0; v < this.positionData.length / 3; v++) {
        var b = [0, 0, 0];
        this.getVertex(b, v);

        var diff = [0, 0, 0];
        glMatrix.vec3.sub(diff, b, p);
        var dotTest = glMatrix.vec3.dot(diff, n);

        // calc dist to plane
        var c = -(n[1] * p[1] + n[0] * p[0]);
        var planeDist =
          Math.abs(n[0] * b[0] + n[1] * b[1] + c) /
          Math.sqrt(n[0] * n[0] + n[1] * n[1]);

        var scaledDelta =
          planeDist < this.R_DIST
            ? (1 - (planeDist / this.R_DIST) ** 2) ** 2 * delta
            : 0;

        if (dotTest < 0) {
          b[2] -= scaledDelta;
        } else if (dotTest > 0) {
          b[2] += scaledDelta;
        }
        this.setVertex(b, v);
      }

      // update delta
      delta = delta / Math.pow(2, this.FAULT_H);
      if (iter % 10 == 0) console.log(delta);
    }

    console.log(this.positionData);
  }

  /**
   * Calculate per-vertex normals for shading
   */
  calculateNormals() {
    // populate normal data array
    this.normalData = new Array(this.positionData.length).fill(0);

    // calculate average normals
    for (var t = 0; t < this.numFaces; t++) {
      var tri = this.faceData.slice(3 * t, 3 * t + 3);

      var v1 = [0, 0, 0];
      this.getVertex(v1, tri[0]);

      var v2 = [0, 0, 0];
      this.getVertex(v2, tri[1]);

      var v3 = [0, 0, 0];
      this.getVertex(v3, tri[2]);

      var normal = [0, 0, 0];
      var left = [0, 0, 0];
      glMatrix.vec3.sub(left, v2, v1);
      var right = [0, 0, 0];
      glMatrix.vec3.sub(right, v3, v1);
      glMatrix.vec3.cross(normal, left, right);

      // divide normal by 2, then add to running calculations
      glMatrix.vec3.scale(normal, normal, 0.5);

      for (var i = 0; i < 3; i++) {
        this.normalData[3 * tri[i]] += normal[0];
        this.normalData[3 * tri[i] + 1] += normal[1];
        this.normalData[3 * tri[i] + 2] += normal[2];
      }
    }

    // convert all to unit vectors
    for (var t = 0; t < this.normalData.length / 3; t++) {
      var mag = glMatrix.vec3.length(this.normalData.slice(3 * t, 3 * t + 3));
      for (var i = 0; i < 3; i++) {
        this.normalData[3 * t + i] *= 1 / mag;
      }
    }

    console.log(this.normalData);
  }

  //-------------------------------------------------------------------------
  // Setup code (run once)
  /**
   * Generates line data from the faces in faceData for wireframe rendering.
   */
  generateLines() {
    for (var f = 0; f < this.faceData.length / 3; f++) {
      // Calculate index of the face
      var fid = f * 3;
      this.edgeData.push(this.faceData[fid]);
      this.edgeData.push(this.faceData[fid + 1]);

      this.edgeData.push(this.faceData[fid + 1]);
      this.edgeData.push(this.faceData[fid + 2]);

      this.edgeData.push(this.faceData[fid + 2]);
      this.edgeData.push(this.faceData[fid]);
    }
  }

  /**
   * Sets up the WebGL buffers and vertex array object.
   * @param {object} shaderProgram The shader program to link the buffers to.
   */
  setupBuffers(shaderProgram) {
    // Create and bind the vertex array object.
    this.vertexArrayObject = gl.createVertexArray();
    gl.bindVertexArray(this.vertexArrayObject);

    // Create the position buffer and load it with the position data.
    this.vertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(this.positionData),
      gl.STATIC_DRAW
    );
    this.vertexPositionBuffer.itemSize = 3;
    this.vertexPositionBuffer.numItems = this.numVertices;
    console.log("Loaded ", this.vertexPositionBuffer.numItems, " vertices.");

    // Link the position buffer to the attribute in the shader program.
    gl.vertexAttribPointer(
      shaderProgram.locations.vertexPosition,
      this.vertexPositionBuffer.itemSize,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(shaderProgram.locations.vertexPosition);

    // Specify normals to be able to do lighting calculations
    this.vertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexNormalBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(this.normalData),
      gl.STATIC_DRAW
    );
    this.vertexNormalBuffer.itemSize = 3;
    this.vertexNormalBuffer.numItems = this.numVertices;
    console.log("Loaded ", this.vertexNormalBuffer.numItems, " normals.");

    // Link the normal buffer to the attribute in the shader program.
    gl.vertexAttribPointer(
      shaderProgram.locations.vertexNormal,
      this.vertexNormalBuffer.itemSize,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(shaderProgram.locations.vertexNormal);

    // Set up the buffer of indices that tells WebGL which vertices are
    // part of which triangles.
    this.triangleIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triangleIndexBuffer);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint32Array(this.faceData),
      gl.STATIC_DRAW
    );
    // TODO: changed
    // this.triangleIndexBuffer.itemSize = 3;
    // this.triangleIndexBuffer.numItems = this.faceData.length / 3;
    this.triangleIndexBuffer.itemSize = 1;
    this.triangleIndexBuffer.numItems = this.faceData.length;
    console.log("Loaded ", this.triangleIndexBuffer.numItems, " triangles.");

    // Set up the index buffer for drawing edges.
    this.edgeIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.edgeIndexBuffer);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint32Array(this.edgeData),
      gl.STATIC_DRAW
    );
    this.edgeIndexBuffer.itemSize = 1;
    this.edgeIndexBuffer.numItems = this.edgeData.length;

    // Unbind everything; we want to bind the correct element buffer and
    // VAO when we want to draw stuff
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
  }

  //-------------------------------------------------------------------------
  // Rendering functions (run every frame in draw())
  /**
   * Renders the terrain to the screen as triangles.
   */
  drawTriangles() {
    gl.bindVertexArray(this.vertexArrayObject);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triangleIndexBuffer);
    gl.drawElements(
      gl.TRIANGLES,
      this.triangleIndexBuffer.numItems,
      gl.UNSIGNED_INT,
      0
    );
  }

  /**
   * Renders the terrain to the screen as edges, wireframe style.
   */
  drawEdges() {
    gl.bindVertexArray(this.vertexArrayObject);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.edgeIndexBuffer);
    gl.drawElements(
      gl.LINES,
      this.edgeIndexBuffer.numItems,
      gl.UNSIGNED_INT,
      0
    );
  }

  //-------------------------------------------------------------------------
  // Debugging
  /**
   * Prints the contents of the buffers to the console for debugging.
   */
  printBuffers() {
    for (var i = 0; i < this.numVertices; i++) {
      console.log(
        "v ",
        this.positionData[i * 3],
        " ",
        this.positionData[i * 3 + 1],
        " ",
        this.positionData[i * 3 + 2],
        " "
      );
    }
    for (var i = 0; i < this.numVertices; i++) {
      console.log(
        "n ",
        this.normalData[i * 3],
        " ",
        this.normalData[i * 3 + 1],
        " ",
        this.normalData[i * 3 + 2],
        " "
      );
    }
    for (var i = 0; i < this.numFaces; i++) {
      console.log(
        "f ",
        this.faceData[i * 3],
        " ",
        this.faceData[i * 3 + 1],
        " ",
        this.faceData[i * 3 + 2],
        " "
      );
    }
  }

  // MY HELPERS
  /**
   * Generates a random float in the range [lower, upper)
   * @param {*} lower
   * @param {*} upper
   */
  randRange(lower, upper) {
    return Math.random() * (upper - lower) + lower;
  }
} // class Terrain
