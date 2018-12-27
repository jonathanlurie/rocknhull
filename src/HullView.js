import * as THREE from 'three'
import { ConvexBufferGeometry } from './thirdparty/ConvexGeometry'


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

    this._cachedAnchorPoints = []
    let anchorPointsMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff })
    let anchorPointsGeometry = new THREE.SphereBufferGeometry(1, 32, 32)
    this._anchorPointsMesh = new THREE.Mesh(anchorPointsGeometry, anchorPointsMaterial)
    this._convexHullMaterial = new THREE.MeshPhongMaterial({ color: 0x6fe2db })

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

    for (let i = apc.children.length - 1; i >= 0; i--) {
      apc.remove(apc.children[i])
    }

    this._on.renderNeeded()
  }


  /**
   * @private
   * remove everything from the convex hull container
   */
  _flushConvexHullContainer () {
    let chc = this._convexHullContainer

    for (let i = chc.children.length - 1; i >= 0; i--) {
      chc.remove(chc.children[i])
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


  /**
   * Build the convex hull and add it to the scene
   * @return {[type]} [description]
   */
  buildConvexHull () {
    if (!this._cachedAnchorPoints.length) {
      this._cachedAnchorPoints = this._anchorPointCollection.getAllAnchorPoints()
    }

    if (this._cachedAnchorPoints.length < 3) {
      console.warn('At least 4 points are required to build a mesh.')
      return null
    }

    this._flushConvexHullContainer()

    const convexGeometry = new ConvexBufferGeometry(this._cachedAnchorPoints)
    const convexMesh = new THREE.Mesh(convexGeometry, this._convexHullMaterial)
    this._convexHullContainer.add(convexMesh)
    this._on.renderNeeded()

    return convexMesh
  }


  /**
   * Show or hide the anchor points
   * @param  {Boolean} b - true to show, false to hide
   */
  showAnchorPoint (b) {
    this._anchorPointsContainer.visible = b
    this._on.renderNeeded()
  }


  /**
   * Show or hide the convex hull
   * @param  {Boolean} b - true to show, false to hide
   */
  showConvexHull (b) {
    this._convexHullContainer.visible = b
    this._on.renderNeeded()
  }


  /**
   * Enable or disable wireframe rendering for the hull
   * @param  {Boolean} b - true to enable wireframe, false to enable regular (phong) material
   */
  wireframe (b) {
    this._convexHullMaterial.wireframe = b
    this._on.renderNeeded()
  }


}
