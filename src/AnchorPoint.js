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
  constructor(pos){
    this._position = pos
    this._mirror = [false, false, false, false]
  }

  setX(x){
    this._position[0] = x
  }

  setY(y){
    this._position[1] = y
  }

  setZ(z){
    this._position[2] = z
  }


  /**
   * If true, the method `getVector3Ds()` will return the X mirrored point in
   * addition to the regular one
   * @param  {Boolean} en - true to mirror, false to not mirror
   */
  enableMirrorX(en) {
    this._mirror[0] = en
  }


  /**
   * If true, the method `getAnchorPoints()` will return the Y mirrored point in
   * addition to the regular one
   * @param  {Boolean} en - true to mirror, false to not mirror
   */
  enableMirrorY(en) {
    this._mirror[1] = en
  }


  /**
   * If true, the method `getAnchorPoints()` will return the Z mirrored point in
   * addition to the regular one
   * @param  {Boolean} en - true to mirror, false to not mirror
   */
  enableMirrorZ(en) {
    this._mirror[2] = en
  }


  /**
   * If true, the method `getAnchorPoints()` will return the radial symmetrical point in
   * addition to the regular one
   * @param  {Boolean} en - true to symetry, false to not symetry
   */
  enableRadialMirror(en) {
    this._mirror[3] = en
  }


  /**
   * Get all the AnchorPoint, aka. the original one and all its mirror (if enabled)
   * @return {[THREE.Vector3]} An array of THREE.Vector3 built on te fly
   */
  getAnchorPoints() {
    let points = [new THREE.Vector3(...this._position)]

    if (this._mirror[0]) {
      points.push(new THREE.Vector3(-this._position[0], this._position[1], this._position[2]))
    }

    if (this._mirror[1]) {
      points.push(new THREE.Vector3(this._position[0], -this._position[1], this._position[2]))
    }

    if (this._mirror[2]) {
      points.push(new THREE.Vector3(this._position[0], this._position[1], -this._position[2]))
    }

    if (this._mirror[3]) {
      points.push(new THREE.Vector3(-this._position[0], -this._position[1], -this._position[2]))
    }

    return points

  }

}
