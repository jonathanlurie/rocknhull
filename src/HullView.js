import * as THREE from 'three'


export default class HullView {

  /**
   * Build the HullView
   * @param {THREE.Scene} scene
   */
  constructor (scene, anchorPointCollection) {
    this._scene = scene
    this._anchorPointCollection = anchorPointCollection

    this._container = new THREE.Object3D()
    this._anchorPointsContainer = new THREE.Object3D()
    this._convexHullContainer = new THREE.Object3D()

    this._scene.add(this._container)
    this._container.add(this._anchorPointsContainer)
    this._container.add(this._convexHullContainer)

    this._cachedAnchorPoints = null
    let anchorPointsMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 })
    let anchorPointsGeometry = new THREE.SphereBufferGeometry(10, 32, 32)
    this._anchorPointsMesh = new THREE.Mesh(anchorPointsGeometry, anchorPointsMaterial)
    this._convexHullMaterial = new THREE.MeshPhongMaterial({ color: 0xeeeeee })

    this._on = {
      renderNeeded: function () {}
    }
  }


  /**
   * Event called when the webgl context needs to be re-rendered
   * @param  {Function} cb - callback for when a rendering is needed
   */
  onRenderNeeded (cb) {
    if (typeof cb === 'function' ) {
      this._on.renderNeeded = cb
    }
  }


  /**
   * @private
   * remove every anchor points spherical hints
   */
  _flushAnchorPointContainer () {
    let apc = this._anchorPointsContainer
    let ch = apc.children

    for (let i=0; i<ch.length; i++) {
      apc.remove(ch[i])
    }

    this._on.renderNeeded()
  }


  /**
   * @private
   * remove everything from the convex hull container
   */
  _flushConvexHullContainer () {
    let chc = this._convexHullContainer
    let ch = chc.children

    for (let i=0; i<ch.length; i++) {
      chc.remove(ch[i])
    }

    this._on.renderNeeded()
  }


  /**
   * Build the spherical hints for each anchor points and add them to the scene
   * @return {[type]} [description]
   */
  updateAnchorPoints () {
    this._flushAnchorPointContainer() // TODO: not working

    this._cachedAnchorPoints = this._anchorPointCollection.getAllAnchorPoints()
    let apList = this._cachedAnchorPoints

    for (let i=0; i<apList.length; i++) {
      let apMesh = this._anchorPointsMesh.clone()
      apMesh.position.copy(apList[i])
      this._anchorPointsContainer.add(apMesh)
    }

    this._on.renderNeeded()
  }


}
