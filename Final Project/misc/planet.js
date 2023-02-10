// Orion Furnish
var Planet = function(orbitSpeed, rotationSpeed, distance, texture, size) {
	this.orbitSpeed = orbitSpeed;
    this.rotationSpeed = rotationSpeed;
    this.distance = distance;
    this.texture = texture;
    this.size = size;

	if (!(this instanceof Planet)) {
		alert("Planet constructor must be called with the new operator");
	}
};