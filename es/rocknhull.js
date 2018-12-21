import { PerspectiveCamera, Scene, AmbientLight, Color, Fog, AxesHelper, Object3D, GridHelper, DirectionalLight, WebGLRenderer, Raycaster, Vector2, TorusKnotBufferGeometry, MeshPhongMaterial, Mesh, Vector3, Quaternion, EventDispatcher, MOUSE, Spherical } from 'three';

/*
 * @author Eberhard Graether / http://egraether.com/
 * @author Mark Lundin   / http://mark-lundin.com
 * @author Simone Manini / http://daron1337.github.io
 * @author Luca Antiga   / http://lantiga.github.io
 */

/*
* ES6 adapted source from the example folder of THREEJS (because there is no proper repo for it)
* Enables mouse control (pan, zoom, rotation)
*/
const TrackballControls = function (object, domElement) {
  const _this = this;
  const STATE = {
    NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_ZOOM_PAN: 4,
  };

  this.object = object;
  this.domElement = (domElement !== undefined) ? domElement : document;

  // API

  this.enabled = true;

  this.screen = {
    left: 0, top: 0, width: 0, height: 0,
  };

  this.rotateSpeed = 1.0;
  this.zoomSpeed = 1.2;
  this.panSpeed = 0.3;

  this.noRotate = false;
  this.noZoom = false;
  this.noPan = false;

  this.staticMoving = false;
  this.dynamicDampingFactor = 0.5;

  this.minDistance = 0;
  this.maxDistance = Infinity;

  this.keys = [65 /* A */, 83 /* S */, 68];

  // internals

  this.target = new Vector3();

  const EPS = 0.000001;

  const lastPosition = new Vector3();

  let _state = STATE.NONE;


  let _prevState = STATE.NONE;


  const _eye = new Vector3();


  const _movePrev = new Vector2();


  const _moveCurr = new Vector2();


  const _lastAxis = new Vector3();


  let _lastAngle = 0;


  const _zoomStart = new Vector2();


  const _zoomEnd = new Vector2();


  let _touchZoomDistanceStart = 0;


  let _touchZoomDistanceEnd = 0;


  const _panStart = new Vector2();


  const _panEnd = new Vector2();

  // for reset

  this.target0 = this.target.clone();
  this.position0 = this.object.position.clone();
  this.up0 = this.object.up.clone();

  // events

  const changeEvent = { type: 'change' };
  const startEvent = { type: 'start' };
  const endEvent = { type: 'end' };


  // methods

  this.handleResize = function () {
    if (this.domElement === document) {
      this.screen.left = 0;
      this.screen.top = 0;
      this.screen.width = window.innerWidth;
      this.screen.height = window.innerHeight;
    } else {
      const box = this.domElement.getBoundingClientRect();
      // adjustments come from similar code in the jquery offset() function
      const d = this.domElement.ownerDocument.documentElement;
      this.screen.left = box.left + window.pageXOffset - d.clientLeft;
      this.screen.top = box.top + window.pageYOffset - d.clientTop;
      this.screen.width = box.width;
      this.screen.height = box.height;
    }
  };

  const getMouseOnScreen = (function () {
    const vector = new Vector2();

    return function getMouseOnScreen(pageX, pageY) {
      vector.set(
        (pageX - _this.screen.left) / _this.screen.width,
        (pageY - _this.screen.top) / _this.screen.height,
      );

      return vector
    }
  }());

  const getMouseOnCircle = (function () {
    const vector = new Vector2();

    return function getMouseOnCircle(pageX, pageY) {
      vector.set(
        ((pageX - _this.screen.width * 0.5 - _this.screen.left) / (_this.screen.width * 0.5)),
        ((_this.screen.height + 2 * (_this.screen.top - pageY)) / _this.screen.width), // screen.width intentional
      );

      return vector
    }
  }());

  this.rotateCamera = (function () {
    const axis = new Vector3();


    const quaternion = new Quaternion();


    const eyeDirection = new Vector3();


    const objectUpDirection = new Vector3();


    const objectSidewaysDirection = new Vector3();


    const moveDirection = new Vector3();


    let angle;

    return function rotateCamera() {
      moveDirection.set(_moveCurr.x - _movePrev.x, _moveCurr.y - _movePrev.y, 0);
      angle = moveDirection.length();

      if (angle) {
        _eye.copy(_this.object.position).sub(_this.target);

        eyeDirection.copy(_eye).normalize();
        objectUpDirection.copy(_this.object.up).normalize();
        objectSidewaysDirection.crossVectors(objectUpDirection, eyeDirection).normalize();

        objectUpDirection.setLength(_moveCurr.y - _movePrev.y);
        objectSidewaysDirection.setLength(_moveCurr.x - _movePrev.x);

        moveDirection.copy(objectUpDirection.add(objectSidewaysDirection));

        axis.crossVectors(moveDirection, _eye).normalize();

        angle *= _this.rotateSpeed;
        quaternion.setFromAxisAngle(axis, angle);

        _eye.applyQuaternion(quaternion);
        _this.object.up.applyQuaternion(quaternion);

        _lastAxis.copy(axis);
        _lastAngle = angle;
      } else if (!_this.staticMoving && _lastAngle) {
        _lastAngle *= Math.sqrt(1.0 - _this.dynamicDampingFactor);
        _eye.copy(_this.object.position).sub(_this.target);
        quaternion.setFromAxisAngle(_lastAxis, _lastAngle);
        _eye.applyQuaternion(quaternion);
        _this.object.up.applyQuaternion(quaternion);
      }

      _movePrev.copy(_moveCurr);
    }
  }());


  this.zoomCamera = function () {
    let factor;

    if (_state === STATE.TOUCH_ZOOM_PAN) {
      factor = _touchZoomDistanceStart / _touchZoomDistanceEnd;
      _touchZoomDistanceStart = _touchZoomDistanceEnd;
      _eye.multiplyScalar(factor);
    } else {
      factor = 1.0 + (_zoomEnd.y - _zoomStart.y) * _this.zoomSpeed;

      if (factor !== 1.0 && factor > 0.0) {
        _eye.multiplyScalar(factor);
      }

      if (_this.staticMoving) {
        _zoomStart.copy(_zoomEnd);
      } else {
        _zoomStart.y += (_zoomEnd.y - _zoomStart.y) * this.dynamicDampingFactor;
      }
    }
  };

  this.panCamera = (function () {
    const mouseChange = new Vector2();


    const objectUp = new Vector3();


    const pan = new Vector3();

    return function panCamera() {
      mouseChange.copy(_panEnd).sub(_panStart);

      if (mouseChange.lengthSq()) {
        mouseChange.multiplyScalar(_eye.length() * _this.panSpeed);

        pan.copy(_eye).cross(_this.object.up).setLength(mouseChange.x);
        pan.add(objectUp.copy(_this.object.up).setLength(mouseChange.y));

        _this.object.position.add(pan);
        _this.target.add(pan);

        if (_this.staticMoving) {
          _panStart.copy(_panEnd);
        } else {
          _panStart.add(mouseChange.subVectors(_panEnd, _panStart).multiplyScalar(_this.dynamicDampingFactor));
        }
      }
    }
  }());

  this.checkDistances = function () {
    if (!_this.noZoom || !_this.noPan) {
      if (_eye.lengthSq() > _this.maxDistance * _this.maxDistance) {
        _this.object.position.addVectors(_this.target, _eye.setLength(_this.maxDistance));
        _zoomStart.copy(_zoomEnd);
      }

      if (_eye.lengthSq() < _this.minDistance * _this.minDistance) {
        _this.object.position.addVectors(_this.target, _eye.setLength(_this.minDistance));
        _zoomStart.copy(_zoomEnd);
      }
    }
  };

  this.update = function () {
    _eye.subVectors(_this.object.position, _this.target);

    if (!_this.noRotate) {
      _this.rotateCamera();
    }

    if (!_this.noZoom) {
      _this.zoomCamera();
    }

    if (!_this.noPan) {
      _this.panCamera();
    }

    _this.object.position.addVectors(_this.target, _eye);

    _this.checkDistances();

    _this.object.lookAt(_this.target);

    if (lastPosition.distanceToSquared(_this.object.position) > EPS) {
      _this.dispatchEvent(changeEvent);

      lastPosition.copy(_this.object.position);
    }
  };

  this.reset = function () {
    _state = STATE.NONE;
    _prevState = STATE.NONE;

    _this.target.copy(_this.target0);
    _this.object.position.copy(_this.position0);
    _this.object.up.copy(_this.up0);

    _eye.subVectors(_this.object.position, _this.target);

    _this.object.lookAt(_this.target);

    _this.dispatchEvent(changeEvent);

    lastPosition.copy(_this.object.position);
  };

  // listeners

  function keydown(event) {
    if (_this.enabled === false) return

    window.removeEventListener('keydown', keydown);

    _prevState = _state;

    if (_state !== STATE.NONE) {
      return
    } if (event.keyCode === _this.keys[STATE.ROTATE] && !_this.noRotate) {
      _state = STATE.ROTATE;
    } else if (event.keyCode === _this.keys[STATE.ZOOM] && !_this.noZoom) {
      _state = STATE.ZOOM;
    } else if (event.keyCode === _this.keys[STATE.PAN] && !_this.noPan) {
      _state = STATE.PAN;
    }
  }

  function keyup(event) {
    if (_this.enabled === false) return

    _state = _prevState;

    window.addEventListener('keydown', keydown, false);
  }

  function mousedown(event) {
    if (_this.enabled === false) return

    event.preventDefault();
    event.stopPropagation();

    if (_state === STATE.NONE) {
      _state = event.button;
    }

    if (_state === STATE.ROTATE && !_this.noRotate) {
      _moveCurr.copy(getMouseOnCircle(event.pageX, event.pageY));
      _movePrev.copy(_moveCurr);
    } else if (_state === STATE.ZOOM && !_this.noZoom) {
      _zoomStart.copy(getMouseOnScreen(event.pageX, event.pageY));
      _zoomEnd.copy(_zoomStart);
    } else if (_state === STATE.PAN && !_this.noPan) {
      _panStart.copy(getMouseOnScreen(event.pageX, event.pageY));
      _panEnd.copy(_panStart);
    }

    document.addEventListener('mousemove', mousemove, false);
    document.addEventListener('mouseup', mouseup, false);

    _this.dispatchEvent(startEvent);
  }

  function mousemove(event) {
    if (_this.enabled === false) return

    event.preventDefault();
    event.stopPropagation();

    if (_state === STATE.ROTATE && !_this.noRotate) {
      _movePrev.copy(_moveCurr);
      _moveCurr.copy(getMouseOnCircle(event.pageX, event.pageY));
    } else if (_state === STATE.ZOOM && !_this.noZoom) {
      _zoomEnd.copy(getMouseOnScreen(event.pageX, event.pageY));
    } else if (_state === STATE.PAN && !_this.noPan) {
      _panEnd.copy(getMouseOnScreen(event.pageX, event.pageY));
    }
  }

  function mouseup(event) {
    if (_this.enabled === false) return

    event.preventDefault();
    event.stopPropagation();

    _state = STATE.NONE;

    document.removeEventListener('mousemove', mousemove);
    document.removeEventListener('mouseup', mouseup);
    _this.dispatchEvent(endEvent);
  }

  function mousewheel(event) {
    if (_this.enabled === false) return

    if (_this.noZoom === true) return

    event.preventDefault();
    event.stopPropagation();

    switch (event.deltaMode) {
      case 2:
        // Zoom in pages
        _zoomStart.y -= event.deltaY * 0.025;
        break

      case 1:
        // Zoom in lines
        _zoomStart.y -= event.deltaY * 0.01;
        break

      default:
        // undefined, 0, assume pixels
        _zoomStart.y -= event.deltaY * 0.00025;
        break
    }

    _this.dispatchEvent(startEvent);
    _this.dispatchEvent(endEvent);
  }

  function touchstart(event) {
    if (_this.enabled === false) return

    event.preventDefault();

    switch (event.touches.length) {
      case 1:
        _state = STATE.TOUCH_ROTATE;
        _moveCurr.copy(getMouseOnCircle(event.touches[0].pageX, event.touches[0].pageY));
        _movePrev.copy(_moveCurr);
        break

      default: // 2 or more
        _state = STATE.TOUCH_ZOOM_PAN;
        var dx = event.touches[0].pageX - event.touches[1].pageX;
        var dy = event.touches[0].pageY - event.touches[1].pageY;
        _touchZoomDistanceEnd = _touchZoomDistanceStart = Math.sqrt(dx * dx + dy * dy);

        var x = (event.touches[0].pageX + event.touches[1].pageX) / 2;
        var y = (event.touches[0].pageY + event.touches[1].pageY) / 2;
        _panStart.copy(getMouseOnScreen(x, y));
        _panEnd.copy(_panStart);
        break
    }

    _this.dispatchEvent(startEvent);
  }

  function touchmove(event) {
    if (_this.enabled === false) return

    event.preventDefault();
    event.stopPropagation();

    switch (event.touches.length) {
      case 1:
        _movePrev.copy(_moveCurr);
        _moveCurr.copy(getMouseOnCircle(event.touches[0].pageX, event.touches[0].pageY));
        break

      default: // 2 or more
        var dx = event.touches[0].pageX - event.touches[1].pageX;
        var dy = event.touches[0].pageY - event.touches[1].pageY;
        _touchZoomDistanceEnd = Math.sqrt(dx * dx + dy * dy);

        var x = (event.touches[0].pageX + event.touches[1].pageX) / 2;
        var y = (event.touches[0].pageY + event.touches[1].pageY) / 2;
        _panEnd.copy(getMouseOnScreen(x, y));
        break
    }
  }

  function touchend(event) {
    if (_this.enabled === false) return

    switch (event.touches.length) {
      case 0:
        _state = STATE.NONE;
        break

      case 1:
        _state = STATE.TOUCH_ROTATE;
        _moveCurr.copy(getMouseOnCircle(event.touches[0].pageX, event.touches[0].pageY));
        _movePrev.copy(_moveCurr);
        break
    }

    _this.dispatchEvent(endEvent);
  }

  function contextmenu(event) {
    if (_this.enabled === false) return

    event.preventDefault();
  }

  this.dispose = function () {
    this.domElement.removeEventListener('contextmenu', contextmenu, false);
    this.domElement.removeEventListener('mousedown', mousedown, false);
    this.domElement.removeEventListener('wheel', mousewheel, false);

    this.domElement.removeEventListener('touchstart', touchstart, false);
    this.domElement.removeEventListener('touchend', touchend, false);
    this.domElement.removeEventListener('touchmove', touchmove, false);

    document.removeEventListener('mousemove', mousemove, false);
    document.removeEventListener('mouseup', mouseup, false);

    window.removeEventListener('keydown', keydown, false);
    window.removeEventListener('keyup', keyup, false);
  };

  this.domElement.addEventListener('contextmenu', contextmenu, false);
  this.domElement.addEventListener('mousedown', mousedown, false);
  this.domElement.addEventListener('wheel', mousewheel, false);

  this.domElement.addEventListener('touchstart', touchstart, false);
  this.domElement.addEventListener('touchend', touchend, false);
  this.domElement.addEventListener('touchmove', touchmove, false);

  window.addEventListener('keydown', keydown, false);
  window.addEventListener('keyup', keyup, false);

  this.handleResize();

  // force an update at start
  this.update();
};


TrackballControls.prototype = Object.create(EventDispatcher.prototype);

/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 */


// This set of controls performs orbiting, dollying (zooming), and panning.
// Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
//
//    Orbit - left mouse / touch: one-finger move
//    Zoom - middle mouse, or mousewheel / touch: two-finger spread or squish
//    Pan - right mouse, or left mouse + ctrl/meta/shiftKey, or arrow keys / touch: two-finger move

const OrbitControls = function ( object, domElement ) {

  this.object = object;

  this.domElement = ( domElement !== undefined ) ? domElement : document;

  // Set to false to disable this control
  this.enabled = true;

  // "target" sets the location of focus, where the object orbits around
  this.target = new Vector3();

  // How far you can dolly in and out ( PerspectiveCamera only )
  this.minDistance = 0;
  this.maxDistance = Infinity;

  // How far you can zoom in and out ( OrthographicCamera only )
  this.minZoom = 0;
  this.maxZoom = Infinity;

  // How far you can orbit vertically, upper and lower limits.
  // Range is 0 to Math.PI radians.
  this.minPolarAngle = 0; // radians
  this.maxPolarAngle = Math.PI; // radians

  // How far you can orbit horizontally, upper and lower limits.
  // If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
  this.minAzimuthAngle = - Infinity; // radians
  this.maxAzimuthAngle = Infinity; // radians

  // Set to true to enable damping (inertia)
  // If damping is enabled, you must call controls.update() in your animation loop
  this.enableDamping = false;
  this.dampingFactor = 0.25;

  // This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
  // Set to false to disable zooming
  this.enableZoom = true;
  this.zoomSpeed = 1.0;

  // Set to false to disable rotating
  this.enableRotate = true;
  this.rotateSpeed = 1.0;

  // Set to false to disable panning
  this.enablePan = true;
  this.panSpeed = 1.0;
  this.screenSpacePanning = false; // if true, pan in screen-space
  this.keyPanSpeed = 7.0;  // pixels moved per arrow key push

  // Set to true to automatically rotate around the target
  // If auto-rotate is enabled, you must call controls.update() in your animation loop
  this.autoRotate = false;
  this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

  // Set to false to disable use of the keys
  this.enableKeys = true;

  // The four arrow keys
  this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

  // Mouse buttons
  this.mouseButtons = { LEFT: MOUSE.LEFT, MIDDLE: MOUSE.MIDDLE, RIGHT: MOUSE.RIGHT };

  // for reset
  this.target0 = this.target.clone();
  this.position0 = this.object.position.clone();
  this.zoom0 = this.object.zoom;

  //
  // public methods
  //

  this.getPolarAngle = function () {

    return spherical.phi;

  };

  this.getAzimuthalAngle = function () {

    return spherical.theta;

  };

  this.saveState = function () {

    scope.target0.copy( scope.target );
    scope.position0.copy( scope.object.position );
    scope.zoom0 = scope.object.zoom;

  };

  this.reset = function () {

    scope.target.copy( scope.target0 );
    scope.object.position.copy( scope.position0 );
    scope.object.zoom = scope.zoom0;

    scope.object.updateProjectionMatrix();
    scope.dispatchEvent( changeEvent );

    scope.update();

    state = STATE.NONE;

  };

  // this method is exposed, but perhaps it would be better if we can make it private...
  this.update = function () {

    var offset = new Vector3();

    // so camera.up is the orbit axis
    var quat = new Quaternion().setFromUnitVectors( object.up, new Vector3( 0, 1, 0 ) );
    var quatInverse = quat.clone().inverse();

    var lastPosition = new Vector3();
    var lastQuaternion = new Quaternion();

    return function update() {

      var position = scope.object.position;

      offset.copy( position ).sub( scope.target );

      // rotate offset to "y-axis-is-up" space
      offset.applyQuaternion( quat );

      // angle from z-axis around y-axis
      spherical.setFromVector3( offset );

      if ( scope.autoRotate && state === STATE.NONE ) {

        rotateLeft( getAutoRotationAngle() );

      }

      spherical.theta += sphericalDelta.theta;
      spherical.phi += sphericalDelta.phi;

      // restrict theta to be between desired limits
      spherical.theta = Math.max( scope.minAzimuthAngle, Math.min( scope.maxAzimuthAngle, spherical.theta ) );

      // restrict phi to be between desired limits
      spherical.phi = Math.max( scope.minPolarAngle, Math.min( scope.maxPolarAngle, spherical.phi ) );

      spherical.makeSafe();


      spherical.radius *= scale;

      // restrict radius to be between desired limits
      spherical.radius = Math.max( scope.minDistance, Math.min( scope.maxDistance, spherical.radius ) );

      // move target to panned location
      scope.target.add( panOffset );

      offset.setFromSpherical( spherical );

      // rotate offset back to "camera-up-vector-is-up" space
      offset.applyQuaternion( quatInverse );

      position.copy( scope.target ).add( offset );

      scope.object.lookAt( scope.target );

      if ( scope.enableDamping === true ) {

        sphericalDelta.theta *= ( 1 - scope.dampingFactor );
        sphericalDelta.phi *= ( 1 - scope.dampingFactor );

        panOffset.multiplyScalar( 1 - scope.dampingFactor );

      } else {

        sphericalDelta.set( 0, 0, 0 );

        panOffset.set( 0, 0, 0 );

      }

      scale = 1;

      // update condition is:
      // min(camera displacement, camera rotation in radians)^2 > EPS
      // using small-angle approximation cos(x/2) = 1 - x^2 / 8

      if ( zoomChanged ||
        lastPosition.distanceToSquared( scope.object.position ) > EPS ||
        8 * ( 1 - lastQuaternion.dot( scope.object.quaternion ) ) > EPS ) {

        scope.dispatchEvent( changeEvent );

        lastPosition.copy( scope.object.position );
        lastQuaternion.copy( scope.object.quaternion );
        zoomChanged = false;

        return true;

      }

      return false;

    };

  }();

  this.dispose = function () {

    scope.domElement.removeEventListener( 'contextmenu', onContextMenu, false );
    scope.domElement.removeEventListener( 'mousedown', onMouseDown, false );
    scope.domElement.removeEventListener( 'wheel', onMouseWheel, false );

    scope.domElement.removeEventListener( 'touchstart', onTouchStart, false );
    scope.domElement.removeEventListener( 'touchend', onTouchEnd, false );
    scope.domElement.removeEventListener( 'touchmove', onTouchMove, false );

    document.removeEventListener( 'mousemove', onMouseMove, false );
    document.removeEventListener( 'mouseup', onMouseUp, false );

    window.removeEventListener( 'keydown', onKeyDown, false );

    //scope.dispatchEvent( { type: 'dispose' } ); // should this be added here?

  };

  //
  // internals
  //

  var scope = this;

  var changeEvent = { type: 'change' };
  var startEvent = { type: 'start' };
  var endEvent = { type: 'end' };

  var STATE = { NONE: - 1, ROTATE: 0, DOLLY: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_DOLLY_PAN: 4 };

  var state = STATE.NONE;

  var EPS = 0.000001;

  // current position in spherical coordinates
  var spherical = new Spherical();
  var sphericalDelta = new Spherical();

  var scale = 1;
  var panOffset = new Vector3();
  var zoomChanged = false;

  var rotateStart = new Vector2();
  var rotateEnd = new Vector2();
  var rotateDelta = new Vector2();

  var panStart = new Vector2();
  var panEnd = new Vector2();
  var panDelta = new Vector2();

  var dollyStart = new Vector2();
  var dollyEnd = new Vector2();
  var dollyDelta = new Vector2();

  function getAutoRotationAngle() {

    return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

  }

  function getZoomScale() {

    return Math.pow( 0.95, scope.zoomSpeed );

  }

  function rotateLeft( angle ) {

    sphericalDelta.theta -= angle;

  }

  function rotateUp( angle ) {

    sphericalDelta.phi -= angle;

  }

  var panLeft = function () {

    var v = new Vector3();

    return function panLeft( distance, objectMatrix ) {

      v.setFromMatrixColumn( objectMatrix, 0 ); // get X column of objectMatrix
      v.multiplyScalar( - distance );

      panOffset.add( v );

    };

  }();

  var panUp = function () {

    var v = new Vector3();

    return function panUp( distance, objectMatrix ) {

      if ( scope.screenSpacePanning === true ) {

        v.setFromMatrixColumn( objectMatrix, 1 );

      } else {

        v.setFromMatrixColumn( objectMatrix, 0 );
        v.crossVectors( scope.object.up, v );

      }

      v.multiplyScalar( distance );

      panOffset.add( v );

    };

  }();

  // deltaX and deltaY are in pixels; right and down are positive
  var pan = function () {

    var offset = new Vector3();

    return function pan( deltaX, deltaY ) {

      var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

      if ( scope.object.isPerspectiveCamera ) {

        // perspective
        var position = scope.object.position;
        offset.copy( position ).sub( scope.target );
        var targetDistance = offset.length();

        // half of the fov is center to top of screen
        targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );

        // we use only clientHeight here so aspect ratio does not distort speed
        panLeft( 2 * deltaX * targetDistance / element.clientHeight, scope.object.matrix );
        panUp( 2 * deltaY * targetDistance / element.clientHeight, scope.object.matrix );

      } else if ( scope.object.isOrthographicCamera ) {

        // orthographic
        panLeft( deltaX * ( scope.object.right - scope.object.left ) / scope.object.zoom / element.clientWidth, scope.object.matrix );
        panUp( deltaY * ( scope.object.top - scope.object.bottom ) / scope.object.zoom / element.clientHeight, scope.object.matrix );

      } else {

        // camera neither orthographic nor perspective
        console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.' );
        scope.enablePan = false;

      }

    };

  }();

  function dollyIn( dollyScale ) {

    if ( scope.object.isPerspectiveCamera ) {

      scale /= dollyScale;

    } else if ( scope.object.isOrthographicCamera ) {

      scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom * dollyScale ) );
      scope.object.updateProjectionMatrix();
      zoomChanged = true;

    } else {

      console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );
      scope.enableZoom = false;

    }

  }

  function dollyOut( dollyScale ) {

    if ( scope.object.isPerspectiveCamera ) {

      scale *= dollyScale;

    } else if ( scope.object.isOrthographicCamera ) {

      scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom / dollyScale ) );
      scope.object.updateProjectionMatrix();
      zoomChanged = true;

    } else {

      console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );
      scope.enableZoom = false;

    }

  }

  //
  // event callbacks - update the object state
  //

  function handleMouseDownRotate( event ) {

    //console.log( 'handleMouseDownRotate' );

    rotateStart.set( event.clientX, event.clientY );

  }

  function handleMouseDownDolly( event ) {

    //console.log( 'handleMouseDownDolly' );

    dollyStart.set( event.clientX, event.clientY );

  }

  function handleMouseDownPan( event ) {

    //console.log( 'handleMouseDownPan' );

    panStart.set( event.clientX, event.clientY );

  }

  function handleMouseMoveRotate( event ) {

    //console.log( 'handleMouseMoveRotate' );

    rotateEnd.set( event.clientX, event.clientY );

    rotateDelta.subVectors( rotateEnd, rotateStart ).multiplyScalar( scope.rotateSpeed );

    var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

    rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientHeight ); // yes, height

    rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight );

    rotateStart.copy( rotateEnd );

    scope.update();

  }

  function handleMouseMoveDolly( event ) {

    //console.log( 'handleMouseMoveDolly' );

    dollyEnd.set( event.clientX, event.clientY );

    dollyDelta.subVectors( dollyEnd, dollyStart );

    if ( dollyDelta.y > 0 ) {

      dollyIn( getZoomScale() );

    } else if ( dollyDelta.y < 0 ) {

      dollyOut( getZoomScale() );

    }

    dollyStart.copy( dollyEnd );

    scope.update();

  }

  function handleMouseMovePan( event ) {

    //console.log( 'handleMouseMovePan' );

    panEnd.set( event.clientX, event.clientY );

    panDelta.subVectors( panEnd, panStart ).multiplyScalar( scope.panSpeed );

    pan( panDelta.x, panDelta.y );

    panStart.copy( panEnd );

    scope.update();

  }

  function handleMouseWheel( event ) {

    // console.log( 'handleMouseWheel' );

    if ( event.deltaY < 0 ) {

      dollyOut( getZoomScale() );

    } else if ( event.deltaY > 0 ) {

      dollyIn( getZoomScale() );

    }

    scope.update();

  }

  function handleKeyDown( event ) {

    //console.log( 'handleKeyDown' );

    switch ( event.keyCode ) {

      case scope.keys.UP:
        pan( 0, scope.keyPanSpeed );
        scope.update();
        break;

      case scope.keys.BOTTOM:
        pan( 0, - scope.keyPanSpeed );
        scope.update();
        break;

      case scope.keys.LEFT:
        pan( scope.keyPanSpeed, 0 );
        scope.update();
        break;

      case scope.keys.RIGHT:
        pan( - scope.keyPanSpeed, 0 );
        scope.update();
        break;

    }

  }

  function handleTouchStartRotate( event ) {

    //console.log( 'handleTouchStartRotate' );

    rotateStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

  }

  function handleTouchStartDollyPan( event ) {

    //console.log( 'handleTouchStartDollyPan' );

    if ( scope.enableZoom ) {

      var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
      var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;

      var distance = Math.sqrt( dx * dx + dy * dy );

      dollyStart.set( 0, distance );

    }

    if ( scope.enablePan ) {

      var x = 0.5 * ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX );
      var y = 0.5 * ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY );

      panStart.set( x, y );

    }

  }

  function handleTouchMoveRotate( event ) {

    //console.log( 'handleTouchMoveRotate' );

    rotateEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

    rotateDelta.subVectors( rotateEnd, rotateStart ).multiplyScalar( scope.rotateSpeed );

    var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

    rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientHeight ); // yes, height

    rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight );

    rotateStart.copy( rotateEnd );

    scope.update();

  }

  function handleTouchMoveDollyPan( event ) {

    //console.log( 'handleTouchMoveDollyPan' );

    if ( scope.enableZoom ) {

      var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
      var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;

      var distance = Math.sqrt( dx * dx + dy * dy );

      dollyEnd.set( 0, distance );

      dollyDelta.set( 0, Math.pow( dollyEnd.y / dollyStart.y, scope.zoomSpeed ) );

      dollyIn( dollyDelta.y );

      dollyStart.copy( dollyEnd );

    }

    if ( scope.enablePan ) {

      var x = 0.5 * ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX );
      var y = 0.5 * ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY );

      panEnd.set( x, y );

      panDelta.subVectors( panEnd, panStart ).multiplyScalar( scope.panSpeed );

      pan( panDelta.x, panDelta.y );

      panStart.copy( panEnd );

    }

    scope.update();

  }

  //
  // event handlers - FSM: listen for events and reset state
  //

  function onMouseDown( event ) {

    if ( scope.enabled === false ) return;

    event.preventDefault();

    switch ( event.button ) {

      case scope.mouseButtons.LEFT:

        if ( event.ctrlKey || event.metaKey || event.shiftKey ) {

          if ( scope.enablePan === false ) return;

          handleMouseDownPan( event );

          state = STATE.PAN;

        } else {

          if ( scope.enableRotate === false ) return;

          handleMouseDownRotate( event );

          state = STATE.ROTATE;

        }

        break;

      case scope.mouseButtons.MIDDLE:

        if ( scope.enableZoom === false ) return;

        handleMouseDownDolly( event );

        state = STATE.DOLLY;

        break;

      case scope.mouseButtons.RIGHT:

        if ( scope.enablePan === false ) return;

        handleMouseDownPan( event );

        state = STATE.PAN;

        break;

    }

    if ( state !== STATE.NONE ) {

      document.addEventListener( 'mousemove', onMouseMove, false );
      document.addEventListener( 'mouseup', onMouseUp, false );

      scope.dispatchEvent( startEvent );

    }

  }

  function onMouseMove( event ) {

    if ( scope.enabled === false ) return;

    event.preventDefault();

    switch ( state ) {

      case STATE.ROTATE:

        if ( scope.enableRotate === false ) return;

        handleMouseMoveRotate( event );

        break;

      case STATE.DOLLY:

        if ( scope.enableZoom === false ) return;

        handleMouseMoveDolly( event );

        break;

      case STATE.PAN:

        if ( scope.enablePan === false ) return;

        handleMouseMovePan( event );

        break;

    }

  }

  function onMouseUp( event ) {

    if ( scope.enabled === false ) return;

    document.removeEventListener( 'mousemove', onMouseMove, false );
    document.removeEventListener( 'mouseup', onMouseUp, false );

    scope.dispatchEvent( endEvent );

    state = STATE.NONE;

  }

  function onMouseWheel( event ) {

    if ( scope.enabled === false || scope.enableZoom === false || ( state !== STATE.NONE && state !== STATE.ROTATE ) ) return;

    event.preventDefault();
    event.stopPropagation();

    scope.dispatchEvent( startEvent );

    handleMouseWheel( event );

    scope.dispatchEvent( endEvent );

  }

  function onKeyDown( event ) {

    if ( scope.enabled === false || scope.enableKeys === false || scope.enablePan === false ) return;

    handleKeyDown( event );

  }

  function onTouchStart( event ) {

    if ( scope.enabled === false ) return;

    event.preventDefault();

    switch ( event.touches.length ) {

      case 1:  // one-fingered touch: rotate

        if ( scope.enableRotate === false ) return;

        handleTouchStartRotate( event );

        state = STATE.TOUCH_ROTATE;

        break;

      case 2:  // two-fingered touch: dolly-pan

        if ( scope.enableZoom === false && scope.enablePan === false ) return;

        handleTouchStartDollyPan( event );

        state = STATE.TOUCH_DOLLY_PAN;

        break;

      default:

        state = STATE.NONE;

    }

    if ( state !== STATE.NONE ) {

      scope.dispatchEvent( startEvent );

    }

  }

  function onTouchMove( event ) {

    if ( scope.enabled === false ) return;

    event.preventDefault();
    event.stopPropagation();

    switch ( event.touches.length ) {

      case 1: // one-fingered touch: rotate

        if ( scope.enableRotate === false ) return;
        if ( state !== STATE.TOUCH_ROTATE ) return; // is this needed?

        handleTouchMoveRotate( event );

        break;

      case 2: // two-fingered touch: dolly-pan

        if ( scope.enableZoom === false && scope.enablePan === false ) return;
        if ( state !== STATE.TOUCH_DOLLY_PAN ) return; // is this needed?

        handleTouchMoveDollyPan( event );

        break;

      default:

        state = STATE.NONE;

    }

  }

  function onTouchEnd( event ) {

    if ( scope.enabled === false ) return;

    scope.dispatchEvent( endEvent );

    state = STATE.NONE;

  }

  function onContextMenu( event ) {

    if ( scope.enabled === false ) return;

    event.preventDefault();

  }

  //

  scope.domElement.addEventListener( 'contextmenu', onContextMenu, false );

  scope.domElement.addEventListener( 'mousedown', onMouseDown, false );
  scope.domElement.addEventListener( 'wheel', onMouseWheel, false );

  scope.domElement.addEventListener( 'touchstart', onTouchStart, false );
  scope.domElement.addEventListener( 'touchend', onTouchEnd, false );
  scope.domElement.addEventListener( 'touchmove', onTouchMove, false );

  window.addEventListener( 'keydown', onKeyDown, false );

  // force an update at start

  this.update();

};

OrbitControls.prototype = Object.create( EventDispatcher.prototype );
OrbitControls.prototype.constructor = OrbitControls;

Object.defineProperties( OrbitControls.prototype, {

  center: {

    get: function () {

      console.warn( 'OrbitControls: .center has been renamed to .target' );
      return this.target;

    }

  },

  // backward compatibility

  noZoom: {

    get: function () {

      console.warn( 'OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.' );
      return ! this.enableZoom;

    },

    set: function ( value ) {

      console.warn( 'OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.' );
      this.enableZoom = ! value;

    }

  },

  noRotate: {

    get: function () {

      console.warn( 'OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.' );
      return ! this.enableRotate;

    },

    set: function ( value ) {

      console.warn( 'OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.' );
      this.enableRotate = ! value;

    }

  },

  noPan: {

    get: function () {

      console.warn( 'OrbitControls: .noPan has been deprecated. Use .enablePan instead.' );
      return ! this.enablePan;

    },

    set: function ( value ) {

      console.warn( 'OrbitControls: .noPan has been deprecated. Use .enablePan instead.' );
      this.enablePan = ! value;

    }

  },

  noKeys: {

    get: function () {

      console.warn( 'OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.' );
      return ! this.enableKeys;

    },

    set: function ( value ) {

      console.warn( 'OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.' );
      this.enableKeys = ! value;

    }

  },

  staticMoving: {

    get: function () {

      console.warn( 'OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.' );
      return ! this.enableDamping;

    },

    set: function ( value ) {

      console.warn( 'OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.' );
      this.enableDamping = ! value;

    }

  },

  dynamicDampingFactor: {

    get: function () {

      console.warn( 'OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.' );
      return this.dampingFactor;

    },

    set: function ( value ) {

      console.warn( 'OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.' );
      this.dampingFactor = value;

    }

  }

} );

/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link     https://github.com/Pixpipe/quickvoxelcore
* Lab      MCIN - Montreal Neurological Institute
*/


/**
 * The EventManager deals with events, create them, call them.
 * This class is mostly for being inherited from.
 */
class EventManager {
  /**
   * Constructor
   */
  constructor() {
    this._events = {};
  }


  /**
   * Define an event, with a name associated with a function
   * @param  {String} eventName - Name to give to the event
   * @param  {Function} callback - function associated to the even
   */
  on(eventName, callback) {
    if (typeof callback === 'function') {
      if (!(eventName in this._events)) {
        this._events[eventName] = [];
      }
      this._events[eventName].push(callback);
    } else {
      console.warn('The callback must be of type Function');
    }
  }


  emit(eventName, args = []) {
    // the event must exist and be non null
    if ((eventName in this._events) && (this._events[eventName].length > 0)) {
      const events = this._events[eventName];
      for (let i = 0; i < events.length; i += 1) {
        events[i](...args);
      }
    } else {
      console.warn(`No function associated to the event ${eventName}`);
    }
  }
}

/**
 * ThreeContext creates a WebGL context using THREEjs. It also handle mouse control.
 * An event can be associated to a ThreeContext instance: `onRaycast` with the method
 * `.on("onRaycast", function(s){...})` where `s` is the section object being raycasted.
 */
class ThreeContext extends EventManager {
  /**
   * @param {DONObject} divObj - the div object as a DOM element.
   * Will be used to host the WebGL context
   * created by THREE
   */
  constructor(divObj = null) {
    super();
    const that = this;

    if (!divObj) {
      console.error('The ThreeContext needs a div object');
      return
    }

    this._requestFrameId = null;

    // init camera
    this._camera = new PerspectiveCamera(27, divObj.clientWidth / divObj.clientHeight, 1, 10000);
    this._camera.position.z = 500;


    // init scene
    this._scene = new Scene();
    this._scene.add(new AmbientLight(0x444444));

    // fog
    let fogColor = new Color(0xffffff);
    this._scene.background = fogColor;
    this._scene.fog = new Fog(fogColor, 1000, 1500);


    let axesHelper = new AxesHelper( 1000 );
    this._scene.add( axesHelper );

    this._gridContainer = new Object3D();
    let gridHelper = new GridHelper( 2000, 200 );
    this._gridContainer.add(gridHelper);
    this._scene.add(this._gridContainer);

    // adding some light
    const light1 = new DirectionalLight(0xffffff, 0.8);
    // light1.position.set(0, 1000, 0)
    // adding the light to the camera ensure a constant lightin of the model
    this._scene.add(this._camera);
    this._camera.add(light1);

    this._renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this._renderer.setClearColor(0xffffff, 0);
    this._renderer.setPixelRatio(window.devicePixelRatio);
    this._renderer.setSize(divObj.clientWidth, divObj.clientHeight);
    this._renderer.gammaInput = true;
    this._renderer.gammaOutput = true;
    divObj.appendChild(this._renderer.domElement);

    // all the necessary for raycasting
    this._raycaster = new Raycaster();
    this._raycastMouse = new Vector2();

    function onMouseMove(event) {
      const elem = that._renderer.domElement;
      const rect = elem.getBoundingClientRect();
      const relX = event.clientX - rect.left;
      const relY = event.clientY - rect.top;
      that._raycastMouse.x = (relX / that._renderer.domElement.clientWidth) * 2 - 1;
      that._raycastMouse.y = -(relY / that._renderer.domElement.clientHeight) * 2 + 1;
    }

    this._renderer.domElement.addEventListener('mousemove', onMouseMove, false);
    this._renderer.domElement.addEventListener('dblclick', () => {
      this._performRaycast();
    }, false);

    // mouse controls
    this._controls = new OrbitControls(this._camera, this._renderer.domElement);
    //this._controls.rotateSpeed = 3
    this._controls.addEventListener('change', this._render.bind(this));

    window.addEventListener('resize', () => {
      that._camera.aspect = divObj.clientWidth / divObj.clientHeight;
      that._camera.updateProjectionMatrix();
      that._renderer.setSize(divObj.clientWidth, divObj.clientHeight);
      that._controls.handleResize();
      that._render();
    }, false);

    this._render();
    this._animate();
  }


  /**
   * Adds a Thorus knot to the scene
   */
  addSampleShape() {
    const geometry = new TorusKnotBufferGeometry(10, 3, 100, 16);
    const material = new MeshPhongMaterial({ color: Math.ceil(Math.random() * 0xffff00) });
    const torusKnot = new Mesh(geometry, material);
    this._scene.add(torusKnot);
    this._render();
  }


  /**
   * Get the scene object
   * @return {THREE.Scene}
   */
  getScene() {
    return this._scene
  }


  /**
   * Get the field of view angle of the camera, in degrees
   * @return {Number}
   */
  getCameraFieldOfView() {
    return this._camera.fov
  }


  /**
   * Define the camera field of view, in degrees
   * @param {Number} fov - the fov
   */
  setCameraFieldOfView(fov) {
    this._camera.fov = fov;
    this._camera.updateProjectionMatrix();
    this._render();
  }


  /**
   * @private
   * deals with rendering and updating the controls
   */
  _animate() {
    this._requestFrameId = requestAnimationFrame(this._animate.bind(this));
    this._controls.update();
  }


  /**
   * @private
   * Render the scene
   */
  _render() {
    this._renderer.render(this._scene, this._camera);
  }


  /**
   * @private
   * Throw a ray from the camera to the pointer, potentially intersect some sections.
   * If so, emit the event `onRaycast` with the section instance as argument
   */
  _performRaycast() {
    // update the picking ray with the camera and mouse position
    this._raycaster.setFromCamera(this._raycastMouse, this._camera);

    // calculate objects intersecting the picking ray
    const intersects = this._raycaster.intersectObjects(this._scene.children, true);

    if (intersects.length) {
      this.emit('onRaycast', intersects);
    }
  }


  /**
   * Get the png image data as base64, in order to later, export as a file
   */
  getSnapshotData() {
    const strMime = 'image/png';
    // let strDownloadMime = "image/octet-stream"
    const imgData = this._renderer.domElement.toDataURL(strMime);
    // imgData.replace(strMime, strDownloadMime)
    return imgData
  }


  /**
   * Kills the scene, interaction, animation and reset all objects to null
   */
  destroy() {
    this._controls.dispose();
    cancelAnimationFrame(this._requestFrameId);
    this._camera = null;
    this._controls = null;
    this._scene = null;
    this._renderer.domElement.remove();
    this._renderer = null;
  }
}

var main = ({
  ThreeContext,
})

export default main;
//# sourceMappingURL=rocknhull.js.map
