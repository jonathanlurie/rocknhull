import { PerspectiveCamera, Scene, AmbientLight, Color, Fog, AxesHelper, Object3D, GridHelper, DirectionalLight, WebGLRenderer, Raycaster, Vector2, TorusKnotBufferGeometry, MeshPhongMaterial, Mesh, Vector3, Quaternion, EventDispatcher, MOUSE, Spherical, SphereBufferGeometry, MeshBasicMaterial, Geometry, BufferGeometry, Float32BufferAttribute, Line3, Plane, Triangle, Matrix3, Line } from 'three';

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
    this._camera.position.y = 150; 
    this._camera.position.x = 200;

    // init scene
    this._scene = new Scene();
    this._scene.add(new AmbientLight(0x444444));

    // fog
    let fogColor = new Color(0xffffff);
    this._scene.background = fogColor;
    this._scene.fog = new Fog(fogColor, 1500, 2000);

    let axesHelper = new AxesHelper( 100 );
    // just so that it remain visible on top of the grid:
    axesHelper.position.y = 0.05;
    this._scene.add( axesHelper );

    this._gridContainer = new Object3D();
    let gridHelper = new GridHelper( 4000, 400 );
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
    this._controls.addEventListener('change', this.render.bind(this));

    window.addEventListener('resize', () => {
      that._camera.aspect = divObj.clientWidth / divObj.clientHeight;
      that._camera.updateProjectionMatrix();
      that._renderer.setSize(divObj.clientWidth, divObj.clientHeight);
      // that._controls.handleResize()
      that.render();
    }, false);

    this.render();
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
    this.render();
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
    this.render();
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
  render() {
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

/**
 * An instance of AnchorPoint is a logic representation of a point in a 3D
 * cartesian space as well as all its symmetrical clone.
 *
 * Note: this is not a graphic representation.
 */
class AnchorPoint {

  /**
   * @param {Array} pos - position as [x, y, z]
   */
  constructor(pos, id){
    this._position = pos;
    this._id = id;
    this._mirror = [false, false, false, false, false, false, false];
    this._enabled = true;
  }


  /**
   * Set the X component
   * @param {Number} x - the X component of [x, y, z]
   * @return {AnchorPoint} return `this` to enable chaining
   */
  setX(x){
    this._position[0] = x;
    return this
  }


  /**
   * Set the Y component
   * @param {Number} y - the Y component of [x, y, z]
   * @return {AnchorPoint} return `this` to enable chaining
   */
  setY(y){
    this._position[1] = y;
    return this
  }


  /**
   * Set the Z component
   * @param {Number} z - the Z component of [x, y, z]
   * @return {AnchorPoint} return `this` to enable chaining
   */
  setZ(z){
    this._position[2] = z;
    return this
  }


  /**
   * If true, the method `getVector3Ds()` will return the X mirrored point in
   * addition to the regular one
   * @param  {Boolean} en - true to mirror, false to not mirror
   * @return {AnchorPoint} return `this` to enable chaining
   */
  enableMirrorX(en) {
    this._mirror[0] = en;
    return this
  }


  /**
   * If true, the method `getAnchorPoints()` will return the Y mirrored point in
   * addition to the regular one
   * @param  {Boolean} en - true to mirror, false to not mirror
   * @return {AnchorPoint} return `this` to enable chaining
   */
  enableMirrorY(en) {
    this._mirror[1] = en;
    return this
  }


  /**
   * If true, the method `getAnchorPoints()` will return the Z mirrored point in
   * addition to the regular one
   * @param  {Boolean} en - true to mirror, false to not mirror
   * @return {AnchorPoint} return `this` to enable chaining
   */
  enableMirrorZ(en) {
    this._mirror[2] = en;
    return this
  }


  /**
   * If true, the method `getAnchorPoints()` will return the radial symmetrical point in
   * addition to the regular one
   * @param  {Boolean} en - true to symetry, false to not symetry
   * @return {AnchorPoint} return `this` to enable chaining
   */
  enableRadialMirrorX(en) {
    this._mirror[3] = en;
    return this
  }


  /**
   * If true, the method `getAnchorPoints()` will return the radial symmetrical point in
   * addition to the regular one, using the X axis as rotation axis.
   * @param  {Boolean} en - true to symetry, false to not symetry
   * @return {AnchorPoint} return `this` to enable chaining
   */
  enableRadialMirrorY(en) {
    this._mirror[4] = en;
    return this
  }

  /**
   * If true, the method `getAnchorPoints()` will return the radial symmetrical point in
   * addition to the regular one, using the X axis as rotation axis.
   * @param  {Boolean} en - true to symetry, false to not symetry
   * @return {AnchorPoint} return `this` to enable chaining
   */
  enableRadialMirrorZ(en) {
    this._mirror[5] = en;
    return this
  }


  /**
   * If true, the method `getAnchorPoints()` will return the radial symmetrical point in
   * addition to the regular one, using the X axis as rotation axis.
   * @param  {Boolean} en - true to symetry, false to not symetry
   * @return {AnchorPoint} return `this` to enable chaining
   */
  enableRadialMirrorZ(en) {
    this._mirror[5] = en;
    return this
  }


  /**
   * If true, the method `getAnchorPoints()` will return the radial symmetrical point in
   * addition to the regular one, using the origin as rotation point.
   * @param  {Boolean} en - true to symetry, false to not symetry
   * @return {AnchorPoint} return `this` to enable chaining
   */
  enableRadialMirrorO(en) {
    this._mirror[6] = en;
    return this
  }


  /**
   * Flag this point as enabled or disabled
   * @param  {Boolean} b - true to flag it as enabled, false to flag it as disabled
   * @return {AnchorPoint} return `this` to enable chaining
   */
  enable(b) {
    this._enabled = b;
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
      position: new Vector3(...this._position),
    }];

    if (this._mirror[0]) {
      points.push({
        id: this._id,
        position: new Vector3(-this._position[0], this._position[1], this._position[2])
      });
    }

    if (this._mirror[1]) {
      points.push({
        id: this._id,
        position: new Vector3(this._position[0], -this._position[1], this._position[2])
      });
    }

    if (this._mirror[2]) {
      points.push({
        id: this._id,
        position: new Vector3(this._position[0], this._position[1], -this._position[2])
      });
    }

    if (this._mirror[3]) {
      points.push({
        id: this._id,
        position: new Vector3(this._position[0], -this._position[1], -this._position[2])
      });
    }

    if (this._mirror[4]) {
      points.push({
        id: this._id,
        position: new Vector3(-this._position[0], this._position[1], -this._position[2])
      });
    }

    if (this._mirror[5]) {
      points.push({
        id: this._id,
        position: new Vector3(-this._position[0], -this._position[1], this._position[2])
      });
    }

    if (this._mirror[6]) {
      points.push({
        id: this._id,
        position: new Vector3(-this._position[0], -this._position[1], -this._position[2])
      });
    }

    return points
  }


  /**
   * Generate a CSV line of this anchor point
   * @return {string}
   */
  getCSV (){
    let csv = `${this._position[0]}, ${this._position[1]}, ${this._position[2]}, ${this._enabled}, `;
    csv += `${this._mirror[0]}, ${this._mirror[1]}, ${this._mirror[2]}, ${this._mirror[3]}, ${this._mirror[4]}, ${this._mirror[5]}, ${this._mirror[6]}`;
    return csv
  }


  /**
   * Generate the header of the CSV, usefull to create a CSV file
   * @return {String}
   */
  static getHeaderCSV () {
    return '# x, y, z, enabled, mirrorX, mirrorY, mirrorZ, radialMirrorX, radialMirrorY, radialMirrorZ, radialMirrorO'
  }

}

/**
 * Everything to handle a collection of AnchorPoints
 */
class AnchorPointCollection {

  constructor () {
    this._collection = {};
  }


  /**
   * Add a new anchor point to the collection. An ID will be automatically
   * created for it so that it can be retrieved later.
   * @param {Array} pos - position as [x, y, z]
   * @return {Object} anchor point info as {id: string, anchorPoint: AnchorPoint}
   */
  add (pos) {
    // we generate a random ID for this AnchorPoint
    let id = Math.random().toFixed(10).split('.')[1];

    // this way, the id could also be used as a color
    //let id = ~~(Math.random() * 256**3)

    this._collection[id] = new AnchorPoint(pos, id);
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
      let p = this._collection[id];
      delete this._collection[id];
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
    let all = [];
    let ids = Object.keys(this._collection);

    for (let i=0; i<ids.length; i++) {
      let ap = this._collection[ids[i]];
      if (ap.isEnabled()) {
        all = all.concat(ap.getAnchorPoints());
      }
    }
    return all
  }


  /**
   * Delete all the anchor points
   */
  deleteAllAnchorPoints () {
    this._collection = {};
  }


  /**
   * Generate a CSV list of the points available in this collection
   * @return {String|null} a CSV string or null if no point is present
   */
  getCSV () {

    let ids = Object.keys(this._collection);

    if (ids.length === 0) {
      return null
    }

    // starting with the header
    let csv = '# x, y, z, enabled, mirrorX, mirrorY, mirrorZ, radialMirrorX, radialMirrorY, radialMirrorZ, radialMirrorO';
    csv += '\n';

    for (let i=0; i<ids.length; i++) {
      let ap = this._collection[ids[i]];
      csv += ap.getCSV() + '\n';
    }

    return csv
  }


  /**
   * Add some points from a CSV string.
   * Note: the points from the CSV are added to the list of points already in this collection
   * @param {String} csvStr - a string from a CSV file
   */
  addFromCSV (csvStr) {
    let lines = csvStr.trim().split('\n');

    for (let i=0; i<lines.length; i++) {
      let line = lines[i];

      if (line[0] == '#') {
        continue
      }

      let elem = line.split(',').map(elem => elem.trim());
      let anchorPointInfo = this.add([
        parseFloat(elem[0]),
        parseFloat(elem[1]),
        parseFloat(elem[2]),
      ]);

      let ap = anchorPointInfo.anchorPoint;
      ap.enable(elem[3] === 'true');
      ap.enableMirrorX(elem[4] === 'true');
      ap.enableMirrorY(elem[5] === 'true');
      ap.enableMirrorZ(elem[6] === 'true');
      ap.enableRadialMirrorX(elem[7] === 'true');
      ap.enableRadialMirrorY(elem[8] === 'true');
      ap.enableRadialMirrorZ(elem[9] === 'true');
      ap.enableRadialMirrorO(elem[10] === 'true');
    }

  }

}

/*
* @author Mugen87 / https://github.com/Mugen87
*
* Ported from: https://github.com/maurizzzio/quickhull3d/ by Mauricio Poppe (https://github.com/maurizzzio)
*
*/


const Visible = 0;
const Deleted = 1;

function QuickHull() {
  this.tolerance = -1;

  this.faces = []; // the generated faces of the convex hull
  this.newFaces = []; // this array holds the faces that are generated within a single iteration

  // the vertex lists work as follows:
  //
  // let 'a' and 'b' be 'Face' instances
  // let 'v' be points wrapped as instance of 'Vertex'
  //
  //     [v, v, ..., v, v, v, ...]
  //      ^             ^
  //      |             |
  //  a.outside     b.outside
  //
  this.assigned = new VertexList();
  this.unassigned = new VertexList();

  this.vertices = []; // vertices of the hull (internal representation of given geometry data)
}

Object.assign(QuickHull.prototype, {

  setFromPoints(points) {
    if (Array.isArray(points) !== true) {
      console.error('THREE.QuickHull: Points parameter is not an array.');
    }

    if (points.length < 4) {
      console.error('THREE.QuickHull: The algorithm needs at least four points.');
    }

    this.makeEmpty();

    for (let i = 0, l = points.length; i < l; i++) {
      this.vertices.push(new VertexNode(points[i]));
    }

    this.compute();

    return this
  },

  setFromObject(object) {
    const points = [];

    object.updateMatrixWorld(true);

    object.traverse((node) => {
      let i; let l; let
        point;

      const geometry = node.geometry;

      if (geometry !== undefined) {
        if (geometry.isGeometry) {
          const vertices = geometry.vertices;

          for (i = 0, l = vertices.length; i < l; i++) {
            point = vertices[i].clone();
            point.applyMatrix4(node.matrixWorld);

            points.push(point);
          }
        } else if (geometry.isBufferGeometry) {
          const attribute = geometry.attributes.position;

          if (attribute !== undefined) {
            for (i = 0, l = attribute.count; i < l; i++) {
              point = new Vector3();

              point.fromBufferAttribute(attribute, i).applyMatrix4(node.matrixWorld);

              points.push(point);
            }
          }
        }
      }
    });

    return this.setFromPoints(points)
  },

  makeEmpty() {
    this.faces = [];
    this.vertices = [];

    return this
  },

  // Adds a vertex to the 'assigned' list of vertices and assigns it to the given face

  addVertexToFace(vertex, face) {
    vertex.face = face;

    if (face.outside === null) {
      this.assigned.append(vertex);
    } else {
      this.assigned.insertBefore(face.outside, vertex);
    }

    face.outside = vertex;

    return this
  },

  // Removes a vertex from the 'assigned' list of vertices and from the given face

  removeVertexFromFace(vertex, face) {
    if (vertex === face.outside) {
      // fix face.outside link

      if (vertex.next !== null && vertex.next.face === face) {
        // face has at least 2 outside vertices, move the 'outside' reference

        face.outside = vertex.next;
      } else {
        // vertex was the only outside vertex that face had

        face.outside = null;
      }
    }

    this.assigned.remove(vertex);

    return this
  },

  // Removes all the visible vertices that a given face is able to see which are stored in the 'assigned' vertext list

  removeAllVerticesFromFace(face) {
    if (face.outside !== null) {
      // reference to the first and last vertex of this face

      const start = face.outside;
      let end = face.outside;

      while (end.next !== null && end.next.face === face) {
        end = end.next;
      }

      this.assigned.removeSubList(start, end);

      // fix references

      start.prev = end.next = null;
      face.outside = null;

      return start
    }
  },

  // Removes all the visible vertices that 'face' is able to see

  deleteFaceVertices(face, absorbingFace) {
    const faceVertices = this.removeAllVerticesFromFace(face);

    if (faceVertices !== undefined) {
      if (absorbingFace === undefined) {
        // mark the vertices to be reassigned to some other face

        this.unassigned.appendChain(faceVertices);
      } else {
        // if there's an absorbing face try to assign as many vertices as possible to it

        let vertex = faceVertices;

        do {
          // we need to buffer the subsequent vertex at this point because the 'vertex.next' reference
          // will be changed by upcoming method calls

          const nextVertex = vertex.next;

          const distance = absorbingFace.distanceToPoint(vertex.point);

          // check if 'vertex' is able to see 'absorbingFace'

          if (distance > this.tolerance) {
            this.addVertexToFace(vertex, absorbingFace);
          } else {
            this.unassigned.append(vertex);
          }

          // now assign next vertex

          vertex = nextVertex;
        } while (vertex !== null)
      }
    }

    return this
  },

  // Reassigns as many vertices as possible from the unassigned list to the new faces

  resolveUnassignedPoints(newFaces) {
    if (this.unassigned.isEmpty() === false) {
      let vertex = this.unassigned.first();

      do {
        // buffer 'next' reference, see .deleteFaceVertices()

        const nextVertex = vertex.next;

        let maxDistance = this.tolerance;

        let maxFace = null;

        for (let i = 0; i < newFaces.length; i++) {
          const face = newFaces[i];

          if (face.mark === Visible) {
            const distance = face.distanceToPoint(vertex.point);

            if (distance > maxDistance) {
              maxDistance = distance;
              maxFace = face;
            }

            if (maxDistance > 1000 * this.tolerance) break
          }
        }

        // 'maxFace' can be null e.g. if there are identical vertices

        if (maxFace !== null) {
          this.addVertexToFace(vertex, maxFace);
        }

        vertex = nextVertex;
      } while (vertex !== null)
    }

    return this
  },

  // Computes the extremes of a simplex which will be the initial hull

  computeExtremes() {
    const min = new Vector3();
    const max = new Vector3();

    const minVertices = [];
    const maxVertices = [];

    let i; let l; let
      j;

    // initially assume that the first vertex is the min/max

    for (i = 0; i < 3; i++) {
      minVertices[i] = maxVertices[i] = this.vertices[0];
    }

    min.copy(this.vertices[0].point);
    max.copy(this.vertices[0].point);

    // compute the min/max vertex on all six directions

    for (i = 0, l = this.vertices.length; i < l; i++) {
      const vertex = this.vertices[i];
      const point = vertex.point;

      // update the min coordinates

      for (j = 0; j < 3; j++) {
        if (point.getComponent(j) < min.getComponent(j)) {
          min.setComponent(j, point.getComponent(j));
          minVertices[j] = vertex;
        }
      }

      // update the max coordinates

      for (j = 0; j < 3; j++) {
        if (point.getComponent(j) > max.getComponent(j)) {
          max.setComponent(j, point.getComponent(j));
          maxVertices[j] = vertex;
        }
      }
    }

    // use min/max vectors to compute an optimal epsilon

    this.tolerance = 3 * Number.EPSILON * (
      Math.max(Math.abs(min.x), Math.abs(max.x))
      + Math.max(Math.abs(min.y), Math.abs(max.y))
      + Math.max(Math.abs(min.z), Math.abs(max.z))
    );

    return { min: minVertices, max: maxVertices }
  },

  // Computes the initial simplex assigning to its faces all the points
  // that are candidates to form part of the hull

  computeInitialHull: (function () {
    let line3; let plane; let
      closestPoint;

    return function computeInitialHull() {
      if (line3 === undefined) {
        line3 = new Line3();
        plane = new Plane();
        closestPoint = new Vector3();
      }

      let vertex; const
        vertices = this.vertices;
      const extremes = this.computeExtremes();
      const min = extremes.min;
      const max = extremes.max;

      let v0; let v1; let v2; let
        v3;
      let i; let l; let
        j;

      // 1. Find the two vertices 'v0' and 'v1' with the greatest 1d separation
      // (max.x - min.x)
      // (max.y - min.y)
      // (max.z - min.z)

      let distance; let
        maxDistance = 0;
      let index = 0;

      for (i = 0; i < 3; i++) {
        distance = max[i].point.getComponent(i) - min[i].point.getComponent(i);

        if (distance > maxDistance) {
          maxDistance = distance;
          index = i;
        }
      }

      v0 = min[index];
      v1 = max[index];

      // 2. The next vertex 'v2' is the one farthest to the line formed by 'v0' and 'v1'

      maxDistance = 0;
      line3.set(v0.point, v1.point);

      for (i = 0, l = this.vertices.length; i < l; i++) {
        vertex = vertices[i];

        if (vertex !== v0 && vertex !== v1) {
          line3.closestPointToPoint(vertex.point, true, closestPoint);

          distance = closestPoint.distanceToSquared(vertex.point);

          if (distance > maxDistance) {
            maxDistance = distance;
            v2 = vertex;
          }
        }
      }

      // 3. The next vertex 'v3' is the one farthest to the plane 'v0', 'v1', 'v2'

      maxDistance = -1;
      plane.setFromCoplanarPoints(v0.point, v1.point, v2.point);

      for (i = 0, l = this.vertices.length; i < l; i++) {
        vertex = vertices[i];

        if (vertex !== v0 && vertex !== v1 && vertex !== v2) {
          distance = Math.abs(plane.distanceToPoint(vertex.point));

          if (distance > maxDistance) {
            maxDistance = distance;
            v3 = vertex;
          }
        }
      }

      const faces = [];

      if (plane.distanceToPoint(v3.point) < 0) {
        // the face is not able to see the point so 'plane.normal' is pointing outside the tetrahedron

        faces.push(
          Face.create(v0, v1, v2),
          Face.create(v3, v1, v0),
          Face.create(v3, v2, v1),
          Face.create(v3, v0, v2),
        );

        // set the twin edge

        for (i = 0; i < 3; i++) {
          j = (i + 1) % 3;

          // join face[ i ] i > 0, with the first face

          faces[i + 1].getEdge(2).setTwin(faces[0].getEdge(j));

          // join face[ i ] with face[ i + 1 ], 1 <= i <= 3

          faces[i + 1].getEdge(1).setTwin(faces[j + 1].getEdge(0));
        }
      } else {
        // the face is able to see the point so 'plane.normal' is pointing inside the tetrahedron

        faces.push(
          Face.create(v0, v2, v1),
          Face.create(v3, v0, v1),
          Face.create(v3, v1, v2),
          Face.create(v3, v2, v0),
        );

        // set the twin edge

        for (i = 0; i < 3; i++) {
          j = (i + 1) % 3;

          // join face[ i ] i > 0, with the first face

          faces[i + 1].getEdge(2).setTwin(faces[0].getEdge((3 - i) % 3));

          // join face[ i ] with face[ i + 1 ]

          faces[i + 1].getEdge(0).setTwin(faces[j + 1].getEdge(1));
        }
      }

      // the initial hull is the tetrahedron

      for (i = 0; i < 4; i++) {
        this.faces.push(faces[i]);
      }

      // initial assignment of vertices to the faces of the tetrahedron

      for (i = 0, l = vertices.length; i < l; i++) {
        vertex = vertices[i];

        if (vertex !== v0 && vertex !== v1 && vertex !== v2 && vertex !== v3) {
          maxDistance = this.tolerance;
          let maxFace = null;

          for (j = 0; j < 4; j++) {
            distance = this.faces[j].distanceToPoint(vertex.point);

            if (distance > maxDistance) {
              maxDistance = distance;
              maxFace = this.faces[j];
            }
          }

          if (maxFace !== null) {
            this.addVertexToFace(vertex, maxFace);
          }
        }
      }

      return this
    }
  }()),

  // Removes inactive faces

  reindexFaces() {
    const activeFaces = [];

    for (let i = 0; i < this.faces.length; i++) {
      const face = this.faces[i];

      if (face.mark === Visible) {
        activeFaces.push(face);
      }
    }

    this.faces = activeFaces;

    return this
  },

  // Finds the next vertex to create faces with the current hull

  nextVertexToAdd() {
    // if the 'assigned' list of vertices is empty, no vertices are left. return with 'undefined'

    if (this.assigned.isEmpty() === false) {
      let eyeVertex; let
        maxDistance = 0;

      // grap the first available face and start with the first visible vertex of that face

      const eyeFace = this.assigned.first().face;
      let vertex = eyeFace.outside;

      // now calculate the farthest vertex that face can see

      do {
        const distance = eyeFace.distanceToPoint(vertex.point);

        if (distance > maxDistance) {
          maxDistance = distance;
          eyeVertex = vertex;
        }

        vertex = vertex.next;
      } while (vertex !== null && vertex.face === eyeFace)

      return eyeVertex
    }
  },

  // Computes a chain of half edges in CCW order called the 'horizon'.
  // For an edge to be part of the horizon it must join a face that can see
  // 'eyePoint' and a face that cannot see 'eyePoint'.

  computeHorizon(eyePoint, crossEdge, face, horizon) {
    // moves face's vertices to the 'unassigned' vertex list

    this.deleteFaceVertices(face);

    face.mark = Deleted;

    let edge;

    if (crossEdge === null) {
      edge = crossEdge = face.getEdge(0);
    } else {
      // start from the next edge since 'crossEdge' was already analyzed
      // (actually 'crossEdge.twin' was the edge who called this method recursively)

      edge = crossEdge.next;
    }

    do {
      const twinEdge = edge.twin;
      const oppositeFace = twinEdge.face;

      if (oppositeFace.mark === Visible) {
        if (oppositeFace.distanceToPoint(eyePoint) > this.tolerance) {
          // the opposite face can see the vertex, so proceed with next edge

          this.computeHorizon(eyePoint, twinEdge, oppositeFace, horizon);
        } else {
          // the opposite face can't see the vertex, so this edge is part of the horizon

          horizon.push(edge);
        }
      }

      edge = edge.next;
    } while (edge !== crossEdge)

    return this
  },

  // Creates a face with the vertices 'eyeVertex.point', 'horizonEdge.tail' and 'horizonEdge.head' in CCW order

  addAdjoiningFace(eyeVertex, horizonEdge) {
    // all the half edges are created in ccw order thus the face is always pointing outside the hull

    const face = Face.create(eyeVertex, horizonEdge.tail(), horizonEdge.head());

    this.faces.push(face);

    // join face.getEdge( - 1 ) with the horizon's opposite edge face.getEdge( - 1 ) = face.getEdge( 2 )

    face.getEdge(-1).setTwin(horizonEdge.twin);

    return face.getEdge(0) // the half edge whose vertex is the eyeVertex
  },

  //  Adds 'horizon.length' faces to the hull, each face will be linked with the
  //  horizon opposite face and the face on the left/right

  addNewFaces(eyeVertex, horizon) {
    this.newFaces = [];

    let firstSideEdge = null;
    let previousSideEdge = null;

    for (let i = 0; i < horizon.length; i++) {
      const horizonEdge = horizon[i];

      // returns the right side edge

      const sideEdge = this.addAdjoiningFace(eyeVertex, horizonEdge);

      if (firstSideEdge === null) {
        firstSideEdge = sideEdge;
      } else {
        // joins face.getEdge( 1 ) with previousFace.getEdge( 0 )

        sideEdge.next.setTwin(previousSideEdge);
      }

      this.newFaces.push(sideEdge.face);
      previousSideEdge = sideEdge;
    }

    // perform final join of new faces

    firstSideEdge.next.setTwin(previousSideEdge);

    return this
  },

  // Adds a vertex to the hull

  addVertexToHull(eyeVertex) {
    const horizon = [];

    this.unassigned.clear();

    // remove 'eyeVertex' from 'eyeVertex.face' so that it can't be added to the 'unassigned' vertex list

    this.removeVertexFromFace(eyeVertex, eyeVertex.face);

    this.computeHorizon(eyeVertex.point, null, eyeVertex.face, horizon);

    this.addNewFaces(eyeVertex, horizon);

    // reassign 'unassigned' vertices to the new faces

    this.resolveUnassignedPoints(this.newFaces);

    return this
  },

  cleanup() {
    this.assigned.clear();
    this.unassigned.clear();
    this.newFaces = [];

    return this
  },

  compute() {
    let vertex;

    this.computeInitialHull();

    // add all available vertices gradually to the hull

    while ((vertex = this.nextVertexToAdd()) !== undefined) {
      this.addVertexToHull(vertex);
    }

    this.reindexFaces();

    this.cleanup();

    return this
  },

});

//

function Face() {
  this.normal = new Vector3();
  this.midpoint = new Vector3();
  this.area = 0;

  this.constant = 0; // signed distance from face to the origin
  this.outside = null; // reference to a vertex in a vertex list this face can see
  this.mark = Visible;
  this.edge = null;
}

Object.assign(Face, {

  create(a, b, c) {
    const face = new Face();

    const e0 = new HalfEdge(a, face);
    const e1 = new HalfEdge(b, face);
    const e2 = new HalfEdge(c, face);

    // join edges

    e0.next = e2.prev = e1;
    e1.next = e0.prev = e2;
    e2.next = e1.prev = e0;

    // main half edge reference

    face.edge = e0;

    return face.compute()
  },

});

Object.assign(Face.prototype, {

  getEdge(i) {
    let edge = this.edge;

    while (i > 0) {
      edge = edge.next;
      i--;
    }

    while (i < 0) {
      edge = edge.prev;
      i++;
    }

    return edge
  },

  compute: (function () {
    let triangle;

    return function compute() {
      if (triangle === undefined) triangle = new Triangle();

      const a = this.edge.tail();
      const b = this.edge.head();
      const c = this.edge.next.head();

      triangle.set(a.point, b.point, c.point);

      triangle.getNormal(this.normal);
      triangle.getMidpoint(this.midpoint);
      this.area = triangle.getArea();

      this.constant = this.normal.dot(this.midpoint);

      return this
    }
  }()),

  distanceToPoint(point) {
    return this.normal.dot(point) - this.constant
  },

});

// Entity for a Doubly-Connected Edge List (DCEL).

function HalfEdge(vertex, face) {
  this.vertex = vertex;
  this.prev = null;
  this.next = null;
  this.twin = null;
  this.face = face;
}

Object.assign(HalfEdge.prototype, {

  head() {
    return this.vertex
  },

  tail() {
    return this.prev ? this.prev.vertex : null
  },

  length() {
    const head = this.head();
    const tail = this.tail();

    if (tail !== null) {
      return tail.point.distanceTo(head.point)
    }

    return -1
  },

  lengthSquared() {
    const head = this.head();
    const tail = this.tail();

    if (tail !== null) {
      return tail.point.distanceToSquared(head.point)
    }

    return -1
  },

  setTwin(edge) {
    this.twin = edge;
    edge.twin = this;

    return this
  },

});

// A vertex as a double linked list node.

function VertexNode(point) {
  this.point = point;
  this.prev = null;
  this.next = null;
  this.face = null; // the face that is able to see this vertex
}

// A double linked list that contains vertex nodes.

function VertexList() {
  this.head = null;
  this.tail = null;
}

Object.assign(VertexList.prototype, {

  first() {
    return this.head
  },

  last() {
    return this.tail
  },

  clear() {
    this.head = this.tail = null;

    return this
  },

  // Inserts a vertex before the target vertex

  insertBefore(target, vertex) {
    vertex.prev = target.prev;
    vertex.next = target;

    if (vertex.prev === null) {
      this.head = vertex;
    } else {
      vertex.prev.next = vertex;
    }

    target.prev = vertex;

    return this
  },

  // Inserts a vertex after the target vertex

  insertAfter(target, vertex) {
    vertex.prev = target;
    vertex.next = target.next;

    if (vertex.next === null) {
      this.tail = vertex;
    } else {
      vertex.next.prev = vertex;
    }

    target.next = vertex;

    return this
  },

  // Appends a vertex to the end of the linked list

  append(vertex) {
    if (this.head === null) {
      this.head = vertex;
    } else {
      this.tail.next = vertex;
    }

    vertex.prev = this.tail;
    vertex.next = null; // the tail has no subsequent vertex

    this.tail = vertex;

    return this
  },

  // Appends a chain of vertices where 'vertex' is the head.

  appendChain(vertex) {
    if (this.head === null) {
      this.head = vertex;
    } else {
      this.tail.next = vertex;
    }

    vertex.prev = this.tail;

    // ensure that the 'tail' reference points to the last vertex of the chain

    while (vertex.next !== null) {
      vertex = vertex.next;
    }

    this.tail = vertex;

    return this
  },

  // Removes a vertex from the linked list

  remove(vertex) {
    if (vertex.prev === null) {
      this.head = vertex.next;
    } else {
      vertex.prev.next = vertex.next;
    }

    if (vertex.next === null) {
      this.tail = vertex.prev;
    } else {
      vertex.next.prev = vertex.prev;
    }

    return this
  },

  // Removes a list of vertices whose 'head' is 'a' and whose 'tail' is b

  removeSubList(a, b) {
    if (a.prev === null) {
      this.head = b.next;
    } else {
      a.prev.next = b.next;
    }

    if (b.next === null) {
      this.tail = a.prev;
    } else {
      b.next.prev = a.prev;
    }

    return this
  },

  isEmpty() {
    return this.head === null
  },

});

/*
* @author Mugen87 / https://github.com/Mugen87
*/


// ConvexGeometry

function ConvexGeometry(points) {
  Geometry.call(this);

  this.fromBufferGeometry(new ConvexBufferGeometry(points));
  this.mergeVertices();
}

ConvexGeometry.prototype = Object.create(Geometry.prototype);
ConvexGeometry.prototype.constructor = ConvexGeometry;

// ConvexBufferGeometry

function ConvexBufferGeometry(points) {
  BufferGeometry.call(this);

  // buffers

  const vertices = [];
  const normals = [];

  // execute QuickHull

  if (QuickHull === undefined) {
    console.error('THREE.ConvexBufferGeometry: ConvexBufferGeometry relies on THREE.QuickHull');
  }

  const quickHull = new QuickHull().setFromPoints(points);

  // generate vertices and normals

  const faces = quickHull.faces;

  for (let i = 0; i < faces.length; i++) {
    const face = faces[i];
    let edge = face.edge;

    // we move along a doubly-connected edge list to access all face points (see HalfEdge docs)

    do {
      const point = edge.head().point;

      vertices.push(point.x, point.y, point.z);
      normals.push(face.normal.x, face.normal.y, face.normal.z);

      edge = edge.next;
    } while (edge !== face.edge)
  }

  // build geometry

  this.addAttribute('position', new Float32BufferAttribute(vertices, 3));
  this.addAttribute('normal', new Float32BufferAttribute(normals, 3));
}

ConvexBufferGeometry.prototype = Object.create(BufferGeometry.prototype);
ConvexBufferGeometry.prototype.constructor = ConvexBufferGeometry;

/**
 * @author mrdoob / http://mrdoob.com/
 * Adapted to ES6 module by @jonathanlurie
 */

let OBJExporter = function () {};

OBJExporter.prototype = {

  constructor: OBJExporter,

  parse: function ( object ) {

    var output = '';

    var indexVertex = 0;
    var indexVertexUvs = 0;
    var indexNormals = 0;

    var vertex = new Vector3();
    var normal = new Vector3();
    var uv = new Vector2();

    var i, j, k, l, m, face = [];

    var parseMesh = function ( mesh ) {

      var nbVertex = 0;
      var nbNormals = 0;
      var nbVertexUvs = 0;

      var geometry = mesh.geometry;

      var normalMatrixWorld = new Matrix3();

      if ( geometry instanceof Geometry ) {

        geometry = new BufferGeometry().setFromObject( mesh );

      }

      if ( geometry instanceof BufferGeometry ) {

        // shortcuts
        var vertices = geometry.getAttribute( 'position' );
        var normals = geometry.getAttribute( 'normal' );
        var uvs = geometry.getAttribute( 'uv' );
        var indices = geometry.getIndex();

        // name of the mesh object
        output += 'o ' + mesh.name + '\n';

        // name of the mesh material
        if ( mesh.material && mesh.material.name ) {

          output += 'usemtl ' + mesh.material.name + '\n';

        }

        // vertices

        if ( vertices !== undefined ) {

          for ( i = 0, l = vertices.count; i < l; i ++, nbVertex ++ ) {

            vertex.x = vertices.getX( i );
            vertex.y = vertices.getY( i );
            vertex.z = vertices.getZ( i );

            // transfrom the vertex to world space
            vertex.applyMatrix4( mesh.matrixWorld );

            // transform the vertex to export format
            output += 'v ' + vertex.x + ' ' + vertex.y + ' ' + vertex.z + '\n';

          }

        }

        // uvs

        if ( uvs !== undefined ) {

          for ( i = 0, l = uvs.count; i < l; i ++, nbVertexUvs ++ ) {

            uv.x = uvs.getX( i );
            uv.y = uvs.getY( i );

            // transform the uv to export format
            output += 'vt ' + uv.x + ' ' + uv.y + '\n';

          }

        }

        // normals

        if ( normals !== undefined ) {

          normalMatrixWorld.getNormalMatrix( mesh.matrixWorld );

          for ( i = 0, l = normals.count; i < l; i ++, nbNormals ++ ) {

            normal.x = normals.getX( i );
            normal.y = normals.getY( i );
            normal.z = normals.getZ( i );

            // transfrom the normal to world space
            normal.applyMatrix3( normalMatrixWorld );

            // transform the normal to export format
            output += 'vn ' + normal.x + ' ' + normal.y + ' ' + normal.z + '\n';

          }

        }

        // faces

        if ( indices !== null ) {

          for ( i = 0, l = indices.count; i < l; i += 3 ) {

            for ( m = 0; m < 3; m ++ ) {

              j = indices.getX( i + m ) + 1;

              face[ m ] = ( indexVertex + j ) + ( normals || uvs ? '/' + ( uvs ? ( indexVertexUvs + j ) : '' ) + ( normals ? '/' + ( indexNormals + j ) : '' ) : '' );

            }

            // transform the face to export format
            output += 'f ' + face.join( ' ' ) + "\n";

          }

        } else {

          for ( i = 0, l = vertices.count; i < l; i += 3 ) {

            for ( m = 0; m < 3; m ++ ) {

              j = i + m + 1;

              face[ m ] = ( indexVertex + j ) + ( normals || uvs ? '/' + ( uvs ? ( indexVertexUvs + j ) : '' ) + ( normals ? '/' + ( indexNormals + j ) : '' ) : '' );

            }

            // transform the face to export format
            output += 'f ' + face.join( ' ' ) + "\n";

          }

        }

      } else {

        console.warn( 'OBJExporter.parseMesh(): geometry type unsupported', geometry );

      }

      // update index
      indexVertex += nbVertex;
      indexVertexUvs += nbVertexUvs;
      indexNormals += nbNormals;

    };

    var parseLine = function ( line ) {

      var nbVertex = 0;

      var geometry = line.geometry;
      var type = line.type;

      if ( geometry instanceof Geometry ) {

        geometry = new BufferGeometry().setFromObject( line );

      }

      if ( geometry instanceof BufferGeometry ) {

        // shortcuts
        var vertices = geometry.getAttribute( 'position' );

        // name of the line object
        output += 'o ' + line.name + '\n';

        if ( vertices !== undefined ) {

          for ( i = 0, l = vertices.count; i < l; i ++, nbVertex ++ ) {

            vertex.x = vertices.getX( i );
            vertex.y = vertices.getY( i );
            vertex.z = vertices.getZ( i );

            // transfrom the vertex to world space
            vertex.applyMatrix4( line.matrixWorld );

            // transform the vertex to export format
            output += 'v ' + vertex.x + ' ' + vertex.y + ' ' + vertex.z + '\n';

          }

        }

        if ( type === 'Line' ) {

          output += 'l ';

          for ( j = 1, l = vertices.count; j <= l; j ++ ) {

            output += ( indexVertex + j ) + ' ';

          }

          output += '\n';

        }

        if ( type === 'LineSegments' ) {

          for ( j = 1, k = j + 1, l = vertices.count; j < l; j += 2, k = j + 1 ) {

            output += 'l ' + ( indexVertex + j ) + ' ' + ( indexVertex + k ) + '\n';

          }

        }

      } else {

        console.warn( 'OBJExporter.parseLine(): geometry type unsupported', geometry );

      }

      // update index
      indexVertex += nbVertex;

    };

    object.traverse( function ( child ) {

      if ( child instanceof Mesh ) {

        parseMesh( child );

      }

      if ( child instanceof Line ) {

        parseLine( child );

      }

    } );

    return output;

  }

};

/**
 * The HullView in in charge of showing the convext hull
 */
class HullView {

  /**
   * Build the HullView
   * @param {THREE.Scene} scene
   */
  constructor (scene, anchorPointCollection) {
    this._scene = scene;
    this._anchorPointCollection = anchorPointCollection;

    this._container = new Object3D();
    this._anchorPointsContainer = new Object3D();
    this._convexHullContainer = new Object3D();

    this._scene.add(this._container);
    this._container.add(this._anchorPointsContainer);
    this._container.add(this._convexHullContainer);

    this._cachedAnchorPoints = [];
    //let anchorPointsMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff })
    this._anchorPointsGeometry = new SphereBufferGeometry(1, 32, 32);
    //this._anchorPointsMesh = new THREE.Mesh(this._anchorPointsGeometry, anchorPointsMaterial)
    this._convexHullMaterial = new MeshPhongMaterial({ color: 0xeaeaea });

    this._on = {
      renderNeeded: function () {}
    };
  }


  static stringToColour(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    let colour = '#';
    for (let i = 0; i < 3; i++) {
      let value = (hash >> (i * 8)) & 0xFF;
      colour += ('00' + value.toString(16)).substr(-2);
    }
    return colour
  }


  /**
   * Event called when the webgl context needs to be re-rendered
   * @param  {Function} cb - callback for when a rendering is needed
   */
  onRenderNeeded (cb) {
    if (typeof cb === 'function' ) {
      this._on.renderNeeded = cb;
    }
  }


  /**
   * @private
   * remove every anchor points spherical hints
   */
  _flushAnchorPointContainer () {
    let apc = this._anchorPointsContainer;

    for (let i = apc.children.length - 1; i >= 0; i--) {
      apc.remove(apc.children[i]);
    }

    this._on.renderNeeded();
  }


  /**
   * @private
   * remove everything from the convex hull container
   */
  _flushConvexHullContainer () {
    let chc = this._convexHullContainer;

    for (let i = chc.children.length - 1; i >= 0; i--) {
      chc.remove(chc.children[i]);
    }

    this._on.renderNeeded();
  }


  /**
   * Delete the convex hull
   */
  deleteConvexHull () {
    this._flushConvexHullContainer();
  }


  /**
   * Build the spherical hints for each anchor points and add them to the scene
   * @return {[type]} [description]
   */
  updateAnchorPoints () {
    this._flushAnchorPointContainer(); // TODO: not working

    this._cachedAnchorPoints = this._anchorPointCollection.getAllAnchorPoints();
    let apList = this._cachedAnchorPoints;

    for (let i=0; i<apList.length; i++) {
      let color = HullView.stringToColour(apList[i].id.toString());
      let anchorPointsMaterial = new MeshBasicMaterial({ color: color, fog: false });
      let apMesh = new Mesh(this._anchorPointsGeometry, anchorPointsMaterial);
      apMesh.position.copy(apList[i].position);
      this._anchorPointsContainer.add(apMesh);
    }

    this._on.renderNeeded();
  }


  /**
   * Build the convex hull and add it to the scene
   * @return {[type]} [description]
   */
  buildConvexHull () {
    if (!this._cachedAnchorPoints.length) {
      this._cachedAnchorPoints = this._anchorPointCollection.getAllAnchorPoints();
    }

    if (this._cachedAnchorPoints.length < 3) {
      console.warn('At least 4 points are required to build a mesh.');
      return null
    }

    this._flushConvexHullContainer();

    const convexGeometry = new ConvexBufferGeometry(this._cachedAnchorPoints.map(x => x.position));
    const convexMesh = new Mesh(convexGeometry, this._convexHullMaterial);
    this._convexHullContainer.add(convexMesh);
    this._on.renderNeeded();

    return convexMesh
  }


  /**
   * Show or hide the anchor points
   * @param  {Boolean} b - true to show, false to hide
   */
  showAnchorPoint (b) {
    this._anchorPointsContainer.visible = b;
    this._on.renderNeeded();
  }


  /**
   * Show or hide the convex hull
   * @param  {Boolean} b - true to show, false to hide
   */
  showConvexHull (b) {
    this._convexHullContainer.visible = b;
    this._on.renderNeeded();
  }


  /**
   * Enable or disable wireframe rendering for the hull
   * @param  {Boolean} b - true to enable wireframe, false to enable regular (phong) material
   */
  wireframe (b) {
    this._convexHullMaterial.wireframe = b;
    this._on.renderNeeded();
  }


  /**
   * Get the OBJ string of the convex hull mesh
   * @return {String|null}
   */
  exportHullOBJ () {
    if (this._convexHullContainer.children.length > 0) {
      let exporter = new OBJExporter();
      let result = exporter.parse( this._convexHullContainer );
      return result
    }

    return null
  }

}

/**
 * Entry point of the Rocknhull project core. Initialize a few things and exposes
 * its instance of `AnchorPointCollection` and `HullView`
 */
class Rocknhull {

  constructor (div) {
    let that = this;
    this._threeContext = new ThreeContext(div);
    this._anchorPointCollection = new AnchorPointCollection();
    this._hullView = new HullView(
      this._threeContext.getScene(),
      this._anchorPointCollection
    );

    this._hullView.onRenderNeeded(function(){
      that._threeContext.render();
    });
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

var main = ({
  Rocknhull,
})

export default main;
//# sourceMappingURL=rocknhull.js.map
