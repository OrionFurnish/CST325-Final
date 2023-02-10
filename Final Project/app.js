// Orion Furnish
'use strict'

var gl;

var appInput = new Input();
var time = new Time();
var camera = new OrbitCamera(appInput);
var earthCameraMode = false;

var planetList = [];
var moon;

var planetGeometryList = [];
var sunGeometry = null;
var moonGeometry = null;
var earthAtmosphereGeometry = null;
var skyboxGeometryList = [];

var projectionMatrix = new Matrix4();
var lightPosition = new Vector3(0, 0, 0);

// the shader that will be used by each piece of geometry (they could each use their own shader but in this case it will be the same)
var phongShaderProgram;
var flatColorShaderProgram;
var unlitShaderProgram;

// auto start the app when the html page is ready
window.onload = window['initializeAndStartRendering'];

// we need to asynchronously fetch files from the "server" (your local hard drive)
var loadedAssets = {
    phongTextVS: null, phongTextFS: null,
    flatColorTextVS: null, flatColorTextFS: null,
    unlitShaderTextVS: null, unlitTextTextFS: null,
    sphereJSON: null,
    earthImage: null, sunImage: null,
    jupiterImage: null, marsImage: null,
    mercuryImage: null, neptuneImage: null,
    saturnImage: null, uranusImage: null,
    venusImage: null, moonImage: null,
    cloudsImage: null, skyboxNegX: null,
    skyboxNegY: null, skyboxNegZ: null,
    skyboxPosX: null, skyboxPosY: null,
    skyboxPosZ: null
};

// -------------------------------------------------------------------------
function initializeAndStartRendering() {
    initGL();
    loadAssets(function() {
        createShaders(loadedAssets);
        createScene();

        updateAndRender();
    });
}

// -------------------------------------------------------------------------
function initGL(canvas) {
    var canvas = document.getElementById("webgl-canvas");

    try {
        gl = canvas.getContext("webgl", { alpha: false });
        gl.canvasWidth = canvas.width;
        gl.canvasHeight = canvas.height;

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
    } catch (e) {}

    if (!gl) {
        alert("Could not initialise WebGL, sorry :-(");
    }
}

// -------------------------------------------------------------------------
function loadAssets(onLoadedCB) {
    var filePromises = [
        fetch('./shaders/phong.vs.glsl').then((response) => { return response.text(); }),
        fetch('./shaders/phong.pointlit.fs.glsl').then((response) => { return response.text(); }),
        fetch('./shaders/flat.color.vs.glsl').then((response) => { return response.text(); }),
        fetch('./shaders/flat.color.fs.glsl').then((response) => { return response.text(); }),
        fetch('./shaders/unlit.textured.vs.glsl').then((response) => { return response.text(); }),
        fetch('./shaders/unlit.textured.fs.glsl').then((response) => { return response.text(); }),
        fetch('./data/sphere.json').then((response) => { return response.json(); }),
        loadImage('./data/earth.jpg'),
        loadImage('./data/sun.jpg'),
        loadImage('./data/Additional Planets/jupiter.jpg'),
        loadImage('./data/Additional Planets/mars.jpg'),
        loadImage('./data/Additional Planets/mercury.jpg'),
        loadImage('./data/Additional Planets/neptune.jpg'),
        loadImage('./data/Additional Planets/saturn.jpg'),
        loadImage('./data/Additional Planets/uranus.jpg'),
        loadImage('./data/Additional Planets/venusAt.jpg'),
        loadImage('./data/moon.png'),
        loadImage('./data/Earth Day-Night-Clouds/2k_earth_clouds.jpg'),
        loadImage('./data/Skybox Faces/GalaxyTex_NegativeX.png'),
        loadImage('./data/Skybox Faces/GalaxyTex_NegativeY.png'),
        loadImage('./data/Skybox Faces/GalaxyTex_NegativeZ.png'),
        loadImage('./data/Skybox Faces/GalaxyTex_PositiveX.png'),
        loadImage('./data/Skybox Faces/GalaxyTex_PositiveY.png'),
        loadImage('./data/Skybox Faces/GalaxyTex_PositiveZ.png')
    ];

    Promise.all(filePromises).then(function(values) {
        // Assign loaded data to our named variables
        loadedAssets.phongTextVS = values[0];
        loadedAssets.phongTextFS = values[1];
        loadedAssets.flatColorTextVS = values[2];
        loadedAssets.flatColorTextFS = values[3];
        loadedAssets.unlitShaderTextVS = values[4];
        loadedAssets.unlitShaderTextFS = values[5];
        loadedAssets.sphereJSON = values[6];
        loadedAssets.earthImage = values[7];
        loadedAssets.sunImage = values[8];
        loadedAssets.jupiterImage = values[9];
        loadedAssets.marsImage = values[10];
        loadedAssets.mercuryImage = values[11];
        loadedAssets.neptuneImage = values[12];
        loadedAssets.saturnImage = values[13];
        loadedAssets.uranusImage = values[14];
        loadedAssets.venusImage = values[15];
        loadedAssets.moonImage = values[16];
        loadedAssets.cloudsImage = values[17];
        loadedAssets.skyboxNegX = values[18];
        loadedAssets.skyboxNegY = values[19];
        loadedAssets.skyboxNegZ = values[20];
        loadedAssets.skyboxPosX = values[21];
        loadedAssets.skyboxPosY = values[22];
        loadedAssets.skyboxPosZ = values[23];
    }).catch(function(error) {
        console.error(error.message);
    }).finally(function() {
        onLoadedCB();
    });
}

// -------------------------------------------------------------------------
function createShaders(loadedAssets) {
    // Phong
    phongShaderProgram = createCompiledAndLinkedShaderProgram(loadedAssets.phongTextVS, loadedAssets.phongTextFS);

    phongShaderProgram.attributes = {
        vertexPositionAttribute: gl.getAttribLocation(phongShaderProgram, "aVertexPosition"),
        vertexNormalsAttribute: gl.getAttribLocation(phongShaderProgram, "aNormal"),
        vertexTexcoordsAttribute: gl.getAttribLocation(phongShaderProgram, "aTexcoords")
    };

    phongShaderProgram.uniforms = {
        worldMatrixUniform: gl.getUniformLocation(phongShaderProgram, "uWorldMatrix"),
        viewMatrixUniform: gl.getUniformLocation(phongShaderProgram, "uViewMatrix"),
        projectionMatrixUniform: gl.getUniformLocation(phongShaderProgram, "uProjectionMatrix"),
        lightPositionUniform: gl.getUniformLocation(phongShaderProgram, "uLightPosition"),
        cameraPositionUniform: gl.getUniformLocation(phongShaderProgram, "uCameraPosition"),
        textureUniform: gl.getUniformLocation(phongShaderProgram, "uTexture"),
        alphaUniform: gl.getUniformLocation(phongShaderProgram, "uAlpha"),
    };

    // Flat Color
    flatColorShaderProgram = createCompiledAndLinkedShaderProgram(loadedAssets.flatColorTextVS, loadedAssets.flatColorTextFS);

    flatColorShaderProgram.attributes = {
        vertexPositionAttribute: gl.getAttribLocation(flatColorShaderProgram, "aVertexPosition")
    };

    flatColorShaderProgram.uniforms = {
        worldMatrixUniform: gl.getUniformLocation(flatColorShaderProgram, "uWorldMatrix"),
        viewMatrixUniform: gl.getUniformLocation(flatColorShaderProgram, "uViewMatrix"),
        projectionMatrixUniform: gl.getUniformLocation(flatColorShaderProgram, "uProjectionMatrix"),
    };


    // Textured
    unlitShaderProgram = createCompiledAndLinkedShaderProgram(loadedAssets.unlitShaderTextVS, loadedAssets.unlitShaderTextFS);

    unlitShaderProgram.attributes = {
        vertexPositionAttribute: gl.getAttribLocation(unlitShaderProgram, "aVertexPosition"),
        vertexTexcoordsAttribute: gl.getAttribLocation(unlitShaderProgram, "aTexcoords")
    };

    unlitShaderProgram.uniforms = {
        worldMatrixUniform: gl.getUniformLocation(unlitShaderProgram, "uWorldMatrix"),
        viewMatrixUniform: gl.getUniformLocation(unlitShaderProgram, "uViewMatrix"),
        projectionMatrixUniform: gl.getUniformLocation(unlitShaderProgram, "uProjectionMatrix"),
        textureUniform: gl.getUniformLocation(unlitShaderProgram, "uTexture"),
        alphaUniform: gl.getUniformLocation(unlitShaderProgram, "uAlpha"),
    };

}

// -------------------------------------------------------------------------
function createScene() {
    // Skybox
    var skyboxScale = 1000.0;
    var translation = new Matrix4().makeTranslation(0.0, -skyboxScale/2.0, 0.0);
    var rotationMatrix = new Matrix4().makeRotationX(-90);
    createSkyboxGeometry(skyboxScale, rotationMatrix, translation, loadedAssets.skyboxNegY);

    translation = new Matrix4().makeTranslation(0.0, skyboxScale/2.0, 0.0);
    rotationMatrix = new Matrix4().makeRotationX(90);
    createSkyboxGeometry(skyboxScale, rotationMatrix, translation, loadedAssets.skyboxPosY);

    translation = new Matrix4().makeTranslation(-skyboxScale/2.0, 0.0, 0.0);
    rotationMatrix = new Matrix4().makeRotationY(90);
    createSkyboxGeometry(skyboxScale, rotationMatrix, translation, loadedAssets.skyboxNegX);

    translation = new Matrix4().makeTranslation(skyboxScale/2.0, 0.0, 0.0);
    rotationMatrix = new Matrix4().makeRotationY(-90);
    createSkyboxGeometry(skyboxScale, rotationMatrix, translation, loadedAssets.skyboxPosX);

    translation = new Matrix4().makeTranslation(0.0, 0.0, -skyboxScale/2.0);
    rotationMatrix = new Matrix4().makeRotationY(0);
    createSkyboxGeometry(skyboxScale, rotationMatrix, translation, loadedAssets.skyboxNegZ);

    translation = new Matrix4().makeTranslation(0.0, 0.0, skyboxScale/2.0);
    rotationMatrix = new Matrix4().makeRotationY(180);
    createSkyboxGeometry(skyboxScale, rotationMatrix, translation, loadedAssets.skyboxPosZ);

    // Create Sun
    sunGeometry = new WebGLGeometryJSON(gl, unlitShaderProgram);
    sunGeometry.create(loadedAssets.sphereJSON, loadedAssets.sunImage);
    sunGeometry.alpha = 1;
    
    planetList.push(new Planet(2.0, 1.0, 3.0, loadedAssets.mercuryImage, 0.005)); // Mercury
    planetList.push(new Planet(1.5, 2.0, 4.0, loadedAssets.venusImage, 0.008)); // Venus
    planetList.push(new Planet(1.0, 1.0, 6.0, loadedAssets.earthImage, 0.01)); // Earth
    planetList.push(new Planet(0.7, 2.2, 8.0, loadedAssets.marsImage, 0.007)); // Mars
    planetList.push(new Planet(0.5, 0.9, 12.0, loadedAssets.jupiterImage, 0.03)); // Jupiter
    planetList.push(new Planet(0.3, 1.2, 16.0, loadedAssets.saturnImage, 0.015)); // Saturn
    planetList.push(new Planet(0.2, 1.3, 18.0, loadedAssets.uranusImage, 0.016)); // Uranus
    planetList.push(new Planet(0.1, 1.1, 21.0, loadedAssets.neptuneImage, 0.0165)); // Neptune

    // Create Planets
    for (var i = 0; i < planetList.length; ++i) {
        var sphereGeometry = new WebGLGeometryJSON(gl, phongShaderProgram);
        sphereGeometry.create(loadedAssets.sphereJSON, planetList[i].texture);
        planetGeometryList.push(sphereGeometry);
    }

    // Moon
    moon = new Planet(3.0, 1.5, 1.0, loadedAssets.moonImage, 0.005);
    moonGeometry = new WebGLGeometryJSON(gl, phongShaderProgram);
    moonGeometry.create(loadedAssets.sphereJSON, moon.texture);

    // Earth Atmosphere
    earthAtmosphereGeometry = new WebGLGeometryJSON(gl, phongShaderProgram);
    earthAtmosphereGeometry.create(loadedAssets.sphereJSON, loadedAssets.cloudsImage);
    earthAtmosphereGeometry.alpha = 0.5;
}

function createSkyboxGeometry(scale, rotationMatrix, translationMatrix, image) {
    var geometry = new WebGLGeometryQuad(gl, unlitShaderProgram);
    geometry.create(image);
    var scaleMatrix = new Matrix4().makeScale(scale, scale, scale);
    geometry.worldMatrix.makeIdentity();
    geometry.worldMatrix.multiply(translationMatrix).multiply(rotationMatrix).multiply(scaleMatrix);
    skyboxGeometryList.push(geometry);
}

// -------------------------------------------------------------------------
var rotation = 0.0;
function updateAndRender() {
    requestAnimationFrame(updateAndRender);

    var aspectRatio = gl.canvasWidth / gl.canvasHeight;
    rotation -= time.deltaTime*75;

    // Planet Matrices
    for (var i = 0; i < planetGeometryList.length; ++i) {
        var planet = planetList[i];
        var planetRotationMatrix = new Matrix4().makeRotationY(rotation*planet.orbitSpeed).multiply(
            new Matrix4().makeTranslation(planet.distance, 1.5, 0.0, 1.0));
        planetRotationMatrix.multiply(new Matrix4().makeRotationY(rotation*planet.rotationSpeed));
        planetGeometryList[i].worldMatrix = planetRotationMatrix.multiply(new Matrix4().makeScale(planet.size, planet.size, planet.size));
    }

    // Sun Matrix
    var scale = new Matrix4().makeScale(0.03, 0.03, 0.03);
    var translation = new Matrix4().makeTranslation(0, 1.5, 0);
    sunGeometry.worldMatrix.makeIdentity();
    sunGeometry.worldMatrix.multiply(translation).multiply(scale).multiply(new Matrix4().makeRotationY(rotation*.05));

    // Moon Matrix
    var earthMatrix = planetGeometryList[2].worldMatrix;
    var earthTranslation = new Vector4(earthMatrix.getElement(0, 3), earthMatrix.getElement(1, 3), earthMatrix.getElement(2, 3), 1);
	var orbitMatrix = new Matrix4().makeRotationY(rotation*moon.orbitSpeed);
	orbitMatrix.multiply(new Matrix4().makeTranslation(moon.distance, 0.0, 0.0));
	moonGeometry.worldMatrix = new Matrix4().makeTranslation(earthTranslation).multiply(orbitMatrix);
    moonGeometry.worldMatrix.multiply(new Matrix4().makeScale(moon.size, moon.size, moon.size));
    moonGeometry.worldMatrix.multiply(new Matrix4().makeRotationY(rotation*moon.rotationSpeed));

    // Earth Atmosphere Matrix
    earthAtmosphereGeometry.worldMatrix = planetGeometryList[2].worldMatrix.clone();
    earthAtmosphereGeometry.worldMatrix.multiply(new Matrix4().makeScale(1.1, 1.1, 1.1));
    earthAtmosphereGeometry.worldMatrix.multiply(new Matrix4().makeRotationY(rotation*0.2));

    if(earthCameraMode) {
        camera.cameraTarget = earthTranslation;
    } else {
        camera.cameraTarget = new Vector4(0, 0, 0, 1);
    }
    
    time.update();
    camera.update(time.deltaTime);

    // specify what portion of the canvas we want to draw to (all of it, full width and height)
    gl.viewport(0, 0, gl.canvasWidth, gl.canvasHeight);

    // this is a new frame so let's clear out whatever happened last frame
    gl.clearColor(0.707, 0.707, 1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(phongShaderProgram);
    var uniforms = phongShaderProgram.uniforms;
    var cameraPosition = camera.getPosition();
    gl.uniform3f(uniforms.lightPositionUniform, lightPosition.x, lightPosition.y, lightPosition.z);
    gl.uniform3f(uniforms.cameraPositionUniform, cameraPosition.x, cameraPosition.y, cameraPosition.z);
    projectionMatrix.makePerspective(45, aspectRatio, 0.1, 1000);

    // Render
    for (var i = 0; i < skyboxGeometryList.length; ++i) {
        skyboxGeometryList[i].render(camera, projectionMatrix, unlitShaderProgram);
    }

    for (var i = 0; i < planetGeometryList.length; ++i) {
        planetGeometryList[i].render(camera, projectionMatrix, phongShaderProgram);
    }

    sunGeometry.render(camera, projectionMatrix, unlitShaderProgram);
    moonGeometry.render(camera, projectionMatrix, phongShaderProgram);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    earthAtmosphereGeometry.render(camera, projectionMatrix, phongShaderProgram);
    gl.disable(gl.BLEND);
}

document.addEventListener('keydown', function(event) {
    if(event.key == "c") {
        earthCameraMode = !earthCameraMode;
    }
});

// EOF 00100001-10