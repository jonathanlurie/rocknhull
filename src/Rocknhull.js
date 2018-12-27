import ThreeContext from './ThreeContext'
import AnchorPointCollection from './AnchorPointCollection'
import HullView from './HullView'


/**
 * Entry point of the Rocknhull project core. Initialize a few things and exposes
 * its instance of `AnchorPointCollection` and `HullView`
 */
export default class Rocknhull {

  constructor (div) {
    let that = this
    this._threeContext = new ThreeContext(div)
    this._anchorPointCollection = new AnchorPointCollection()
    this._hullView = new HullView(
      this._threeContext.getScene(),
      this._anchorPointCollection
    )

    this._hullView.onRenderNeeded(function(){
      that._threeContext.render()
    })
  }


  /**
   * Get the HullView instance
   * @return {HullView}
   */
  getAnchorPointCollection () {
    return this._anchorPointCollection
  }


  /**
   * Get the HullView instance
   * @return {HullView}
   */
  getHullView () {
    return this._hullView
  }
}
