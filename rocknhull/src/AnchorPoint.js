import * as THREE from 'three'


/**
 * An instance of AnchorPoint is a logic representation of a point in a 3D
 * cartesian space as well as all its symmetrical clone.
 *
 * Note: this is not a graphic representation.
 */
export default class AnchorPoint {

  /**
   * @param {Array} pos - position as [x, y, z]
   */
  constructor(pos, id){
    this._position = pos
    this._id = id
    this._mirror = [false, false, false, false, false, false, false]
    this._enabled = true
  }


  /**
   * Set the X component
   * @param {Number} x - the X component of [x, y, z]
   * @return {AnchorPoint} return `this` to enable chaining
   */
  setX(x){
    this._position[0] = x
    return this
  }


  /**
   * Set the Y component
   * @param {Number} y - the Y component of [x, y, z]
   * @return {AnchorPoint} return `this` to enable chaining
   */
  setY(y){
    this._position[1] = y
    return this
  }


  /**
   * Set the Z component
   * @param {Number} z - the Z component of [x, y, z]
   * @return {AnchorPoint} return `this` to enable chaining
   */
  setZ(z){
    this._position[2] = z
    return this
  }


  /**
   * If true, the method `getVector3Ds()` will return the X mirrored point in
   * addition to the regular one
   * @param  {Boolean} en - true to mirror, false to not mirror
   * @return {AnchorPoint} return `this` to enable chaining
   */
  enableMirrorX(en) {
    this._mirror[0] = en
    return this
  }


  /**
   * If true, the method `getAnchorPoints()` will return the Y mirrored point in
   * addition to the regular one
   * @param  {Boolean} en - true to mirror, false to not mirror
   * @return {AnchorPoint} return `this` to enable chaining
   */
  enableMirrorY(en) {
    this._mirror[1] = en
    return this
  }


  /**
   * If true, the method `getAnchorPoints()` will return the Z mirrored point in
   * addition to the regular one
   * @param  {Boolean} en - true to mirror, false to not mirror
   * @return {AnchorPoint} return `this` to enable chaining
   */
  enableMirrorZ(en) {
    this._mirror[2] = en
    return this
  }


  /**
   * If true, the method `getAnchorPoints()` will return the radial symmetrical point in
   * addition to the regular one
   * @param  {Boolean} en - true to symetry, false to not symetry
   * @return {AnchorPoint} return `this` to enable chaining
   */
  enableRadialMirrorX(en) {
    this._mirror[3] = en
    return this
  }


  /**
   * If true, the method `getAnchorPoints()` will return the radial symmetrical point in
   * addition to the regular one, using the X axis as rotation axis.
   * @param  {Boolean} en - true to symetry, false to not symetry
   * @return {AnchorPoint} return `this` to enable chaining
   */
  enableRadialMirrorY(en) {
    this._mirror[4] = en
    return this
  }

  /**
   * If true, the method `getAnchorPoints()` will return the radial symmetrical point in
   * addition to the regular one, using the X axis as rotation axis.
   * @param  {Boolean} en - true to symetry, false to not symetry
   * @return {AnchorPoint} return `this` to enable chaining
   */
  enableRadialMirrorZ(en) {
    this._mirror[5] = en
    return this
  }


  /**
   * If true, the method `getAnchorPoints()` will return the radial symmetrical point in
   * addition to the regular one, using the X axis as rotation axis.
   * @param  {Boolean} en - true to symetry, false to not symetry
   * @return {AnchorPoint} return `this` to enable chaining
   */
  enableRadialMirrorZ(en) {
    this._mirror[5] = en
    return this
  }


  /**
   * If true, the method `getAnchorPoints()` will return the radial symmetrical point in
   * addition to the regular one, using the origin as rotation point.
   * @param  {Boolean} en - true to symetry, false to not symetry
   * @return {AnchorPoint} return `this` to enable chaining
   */
  enableRadialMirrorO(en) {
    this._mirror[6] = en
    return this
  }


  /**
   * Flag this point as enabled or disabled
   * @param  {Boolean} b - true to flag it as enabled, false to flag it as disabled
   * @return {AnchorPoint} return `this` to enable chaining
   */
  enable(b) {
    this._enabled = b
    return this
  }


  isEnabled() {
    return this._enabled
  }

  /**
   * Get all the AnchorPoint, aka. the original one and all its mirror (if enabled)
   * @return {[THREE.Vector3]} An array of THREE.Vector3 built on te fly
   */
  getAnchorPoints() {
    let points = [{
      id: this._id,
      position: new THREE.Vector3(...this._position),
    }]

    if (this._mirror[0]) {
      points.push({
        id: this._id,
        position: new THREE.Vector3(-this._position[0], this._position[1], this._position[2])
      })
    }

    if (this._mirror[1]) {
      points.push({
        id: this._id,
        position: new THREE.Vector3(this._position[0], -this._position[1], this._position[2])
      })
    }

    if (this._mirror[2]) {
      points.push({
        id: this._id,
        position: new THREE.Vector3(this._position[0], this._position[1], -this._position[2])
      })
    }

    if (this._mirror[3]) {
      points.push({
        id: this._id,
        position: new THREE.Vector3(this._position[0], -this._position[1], -this._position[2])
      })
    }

    if (this._mirror[4]) {
      points.push({
        id: this._id,
        position: new THREE.Vector3(-this._position[0], this._position[1], -this._position[2])
      })
    }

    if (this._mirror[5]) {
      points.push({
        id: this._id,
        position: new THREE.Vector3(-this._position[0], -this._position[1], this._position[2])
      })
    }

    if (this._mirror[6]) {
      points.push({
        id: this._id,
        position: new THREE.Vector3(-this._position[0], -this._position[1], -this._position[2])
      })
    }

    return points

  }

}
