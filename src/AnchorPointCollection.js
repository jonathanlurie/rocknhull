import AnchorPoint from './AnchorPoint'

/**
 * Everything to handle a collection of AnchorPoints
 */
export default class AnchorPointCollection {

  constructor () {
    this._collection = {}
  }


  /**
   * Add a new anchor point to the collection. An ID will be automatically
   * created for it so that it can be retrieved later.
   * @param {Array} pos - position as [x, y, z]
   * @return {Object} anchor point info as {id: string, anchorPoint: AnchorPoint}
   */
  add (pos) {
    // we generate a random ID for this AnchorPoint
    let id = Math.random().toFixed(10).split('.')[1]

    this._collection[id] = new AnchorPoint(pos)
    return {
      id: id,
      anchorPoint: this._collection[id]
    }
  }


  /**
   * Get an anchor point from the collection
   * @param  {String} id - the id of the anchor point
   * @return {AnchorPoint|null}
   */
  get (id) {
    if (id in this._collection) {
      return this._collection[id]
    } else {
      return null
    }
  }


  /**
   * Delete the anchor point with the given id from within the collection.
   * To make it not entirely destructive, the point is returned by this method.
   * @param  {String} id - the id of the anchor point
   * @return {AnchorPoint|null}
   */
  delete (id) {
    if (id in this._collection) {
      let p = this._collection[id]
      delete this._collection[id]
      return p
    } else {
      return null
    }
  }


  /**
   * Generate an array of all the anchor point of this collection
   * @return {[THREE.Vector3]} array of THREE.Vector3
   */
  getAllAnchorPoints () {
    let all = []
    let ids = Object.keys(this._collection)
    for (let i=0; i<ids.length; i++) {
      all = all.concat(this._collection[ids[i]].getAnchorPoints())
    }
    return all
  }


  deleteAllAnchorPoints () {
    this._collection = {}
  }

}
