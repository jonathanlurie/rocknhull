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

    // this way, the id could also be used as a color
    //let id = ~~(Math.random() * 256**3)

    this._collection[id] = new AnchorPoint(pos, id)
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
      let ap = this._collection[ids[i]]
      if (ap.isEnabled()) {
        all = all.concat(ap.getAnchorPoints())
      }
    }
    return all
  }


  /**
   * Delete all the anchor points
   */
  deleteAllAnchorPoints () {
    this._collection = {}
  }


  /**
   * Generate a CSV list of the points available in this collection
   * @return {String} a CSV string
   */
  getCSV () {
    // starting with the header
    let csv = '# x, y, z, enabled, mirrorX, mirrorY, mirrorZ, radialMirrorX, radialMirrorY, radialMirrorZ, radialMirrorO'
    csv += '\n'

    let ids = Object.keys(this._collection)

    for (let i=0; i<ids.length; i++) {
      let ap = this._collection[ids[i]]
      csv += ap.getCSV() + '\n'
    }

    return csv
  }


  /**
   * Add some points from a CSV string.
   * Note: the points from the CSV are added to the list of points already in this collection
   * @param {String} csvStr - a string from a CSV file
   */
  addFromCSV (csvStr) {
    let lines = csvStr.trim().split('\n')
    let listOfNewPoint = []

    for (let i=0; i<lines.length; i++) {
      let line = lines[i]

      if (line[0] == '#') {
        continue
      }

      let elem = line.split(',').map(elem => elem.trim())
      let anchorPointInfo = this.add([
        parseFloat(elem[0]),
        parseFloat(elem[1]),
        parseFloat(elem[2]),
      ])

      let ap = anchorPointInfo.anchorPoint
      ap.enable(elem[3] === 'true')
      ap.enableMirrorX(elem[4] === 'true')
      ap.enableMirrorY(elem[5] === 'true')
      ap.enableMirrorZ(elem[6] === 'true')
      ap.enableRadialMirrorX(elem[7] === 'true')
      ap.enableRadialMirrorY(elem[8] === 'true')
      ap.enableRadialMirrorZ(elem[9] === 'true')
      ap.enableRadialMirrorO(elem[10] === 'true')

      listOfNewPoint.push(anchorPointInfo)
    }

  }

}
