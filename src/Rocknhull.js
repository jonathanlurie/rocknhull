import ThreeContext from './ThreeContext'
import AnchorPointCollection from './AnchorPointCollection'
import HullView from './HullView'

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


  getAnchorPointCollection () {
    return this._anchorPointCollection
  }


  getHullView () {
    return this._hullView
  }
}
